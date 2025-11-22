import "./global.css";
import "react-native-get-random-values";
import { LogBox, Platform } from "react-native";
LogBox.ignoreLogs(["Expo AV has been deprecated", "Disconnected from Metro"]);

// Polyfill for web-only libraries (html2canvas, jspdf) on React Native
// These libraries expect a browser environment, so we provide minimal mocks
if (Platform.OS !== 'web' && typeof window !== 'undefined') {
  // Create a mock location object that both window and document can share
  const mockLocation = {
    href: 'about:blank',
    origin: 'about:blank',
    protocol: 'about:',
    host: '',
    hostname: '',
    port: '',
    pathname: 'blank',
    search: '',
    hash: '',
  };

  // Mock window.location for html2canvas
  if (!window.location) {
    (window as any).location = mockLocation;
  }

  // Mock document object for html2canvas
  if (!window.document) {
    (window as any).document = {
      createElement: () => ({
        href: '',
        hostname: '',
        pathname: '',
        protocol: '',
        search: '',
      }),
      location: mockLocation,
    };
  }
}

// Polyfill for latin1 encoding support (required by jspdf/fast-png)
// Latin1 is essentially the first 256 Unicode characters
if (typeof global.TextDecoder !== 'undefined') {
  const OriginalTextDecoder = global.TextDecoder;

  class PatchedTextDecoder extends OriginalTextDecoder {
    private isLatin1: boolean = false;

    constructor(label?: string, options?: TextDecoderOptions) {
      const normalizedLabel = label?.toLowerCase().replace(/[-_]/g, '') || 'utf8';

      // Check if this is a latin1 request
      if (normalizedLabel === 'latin1' || normalizedLabel === 'iso88591') {
        // Use utf-8 as the base decoder
        super('utf-8', options);
        this.isLatin1 = true;
      } else {
        super(label, options);
        this.isLatin1 = false;
      }
    }

    decode(input?: BufferSource, options?: TextDecodeOptions): string {
      if (this.isLatin1 && input) {
        // For Latin1, each byte maps directly to its Unicode codepoint
        const bytes = new Uint8Array(
          input instanceof ArrayBuffer ? input : input.buffer
        );
        let result = '';
        for (let i = 0; i < bytes.length; i++) {
          result += String.fromCharCode(bytes[i]);
        }
        return result;
      }
      return super.decode(input, options);
    }
  }

  global.TextDecoder = PatchedTextDecoder as any;
}

import { registerRootComponent } from "expo";

import App from "./App";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
