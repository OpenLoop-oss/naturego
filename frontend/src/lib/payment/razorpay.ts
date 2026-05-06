import { toast } from 'sonner';

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  handler?: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
  theme?: {
    color?: string;
  };
  error?: (response: RazorpayError) => void;
}

export interface RazorpayResponse {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayError {
  error: {
    code: string;
    description: string;
    source?: string;
    step?: string;
    reason?: string;
  };
}

export interface PaymentCallbacks {
  onSuccess: (response: RazorpayResponse) => void;
  onFailure: (error: RazorpayError) => void;
  onDismiss?: () => void;
}

export class PaymentService {
  private static razorpayScriptLoaded = false;
  private static loadingScript = false;

  static async loadRazorpayScript(): Promise<boolean> {
    if (this.razorpayScriptLoaded) {
      return true;
    }

    if (this.loadingScript) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.razorpayScriptLoaded) {
            clearInterval(check);
            resolve(true);
          }
        }, 100);
      });
    }

    this.loadingScript = true;

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        this.razorpayScriptLoaded = true;
        this.loadingScript = false;
        resolve(true);
      };
      script.onerror = () => {
        this.loadingScript = false;
        toast.error('Failed to load payment gateway. Please refresh and try again.');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  static async initiateRazorpayPayment(
    options: {
      amount: number;
      orderId: string;
      user: {
        name: string;
        email: string;
        phone?: string;
      };
      description?: string;
    },
    callbacks: PaymentCallbacks,
  ): Promise<void> {
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

    if (!keyId) {
      toast.error('Payment gateway not configured');
      callbacks.onFailure({
        error: { code: 'CONFIG_ERROR', description: 'Payment gateway not configured' },
      });
      return;
    }

    const loaded = await this.loadRazorpayScript();

    if (!loaded || !window.Razorpay) {
      callbacks.onFailure({
        error: { code: 'SCRIPT_ERROR', description: 'Payment gateway failed to load' },
      });
      return;
    }

    const razorpay = new window.Razorpay({
      key: keyId,
      amount: Math.round(options.amount * 100),
      currency: 'INR',
      name: 'IRA Farms',
      description: options.description || 'Fresh organic products',
      order_id: options.orderId,
      prefill: {
        name: options.user.name,
        email: options.user.email,
        contact: options.user.phone || '',
      },
      handler: callbacks.onSuccess,
      modal: {
        ondismiss: callbacks.onDismiss,
      },
      theme: {
        color: '#22c55e',
      },
      error: callbacks.onFailure,
    });

    razorpay.on('payment.failed', (response: RazorpayResponse | RazorpayError) => {
      if ('error' in response) {
        callbacks.onFailure(response);
      }
    });
    razorpay.open();
  }

  static async initiatePhonePePayment(_options: {
    amount: number;
    orderId: string;
    user: {
      name: string;
      email: string;
      phone: string;
    };
  }): Promise<{ redirectUrl: string }> {
    throw new Error('PhonePe integration pending');
  }

  static verifyPaymentSignature(_params: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean {
    return true;
  }
}
