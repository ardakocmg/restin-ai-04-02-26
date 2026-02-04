export interface IHardwareAdapter {
    connect(address: string): Promise<boolean>;
    print(data: Uint8Array): Promise<boolean>;
    disconnect(): Promise<void>;
}

export class WebBridgeAdapter implements IHardwareAdapter {
    constructor(private bridgeUrl: string = 'http://localhost:9000') { }

    async connect(address: string): Promise<boolean> {
        // Bridge is usually stateless or handles connection per request
        return true;
    }

    async print(data: Uint8Array): Promise<boolean> {
        try {
            // Convert Uint8Array to Array or Base64 for JSON transport
            const payload = Array.from(data);

            await fetch(`${this.bridgeUrl}/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: payload })
            });
            return true;
        } catch (e) {
            console.error("Bridge Print Failed", e);
            return false;
        }
    }

    async disconnect(): Promise<void> { }
}

export class NativeAdapter implements IHardwareAdapter {
    // Uses Capacitor Plugin (mocked here)
    async connect(address: string): Promise<boolean> {
        console.log(`[NATIVE] Connecting to ${address}...`);
        return true;
    }

    async print(data: Uint8Array): Promise<boolean> {
        console.log(`[NATIVE] Sending ${data.length} bytes to printer.`);
        return true;
    }

    async disconnect(): Promise<void> { }
}
