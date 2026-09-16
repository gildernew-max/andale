import Capacitor
import StoreKit

/// StoreKit 2 bridge for the Brand CLEAR paywall.
/// Product IDs come from JS (`src/purchase.js` stubs). Coin fills ASC prices.
@objc(AndaleIapPlugin)
public class AndaleIapPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AndaleIapPlugin"
    public let jsName = "AndaleIap"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise)
    ]

    @objc func purchase(_ call: CAPPluginCall) {
        guard let productId = call.getString("productId"), !productId.isEmpty else {
            call.resolve(["status": "failure", "reason": "missing_product_id"])
            return
        }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.resolve([
                        "status": "failure",
                        "reason": "product_not_found",
                        "productId": productId
                    ])
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    let transaction = try Self.checked(verification)
                    await transaction.finish()
                    call.resolve([
                        "status": "success",
                        "productId": productId,
                        "transactionId": String(transaction.id)
                    ])
                case .userCancelled:
                    call.resolve([
                        "status": "cancelled",
                        "reason": "user_cancelled",
                        "productId": productId
                    ])
                case .pending:
                    call.resolve([
                        "status": "failure",
                        "reason": "pending",
                        "productId": productId
                    ])
                @unknown default:
                    call.resolve([
                        "status": "failure",
                        "reason": "unknown_storekit",
                        "productId": productId
                    ])
                }
            } catch {
                call.resolve([
                    "status": "failure",
                    "reason": error.localizedDescription,
                    "productId": productId
                ])
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            do {
                try await AppStore.sync()
                var owned: [String] = []
                for await result in Transaction.currentEntitlements {
                    if let transaction = try? Self.checked(result) {
                        owned.append(transaction.productID)
                    }
                }
                if let productId = owned.first {
                    call.resolve([
                        "status": "success",
                        "productId": productId,
                        "owned": owned
                    ])
                } else {
                    call.resolve(["status": "failure", "reason": "nothing_to_restore"])
                }
            } catch {
                call.resolve(["status": "failure", "reason": error.localizedDescription])
            }
        }
    }

    private static func checked<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified(_, let error):
            throw error
        case .verified(let value):
            return value
        }
    }
}
