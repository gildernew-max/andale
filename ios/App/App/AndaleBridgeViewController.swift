import Capacitor

/// Registers the local StoreKit 2 plugin. SceneDelegate + Main storyboard use this.
class AndaleBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(AndaleIapPlugin())
    }
}
