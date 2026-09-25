import Stripe from 'stripe';


let stripeInstance: Stripe | null = null;
export function getStripe() {
    if (!stripeInstance) {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
        stripeInstance = new Stripe(stripeSecretKey, {
            apiVersion: '2026-06-24.dahlia' as any,
            typescript: true,
        });
    }
    return stripeInstance;
}


export interface CreateSubscriptionCheckoutParams {
    schoolId: string;
    schoolName: string;
    userEmail: string;
    existingCustomerId?: string | null;
    successUrl: string;
    cancelUrl: string;
    tierName?: string;
    amountCents?: number;
}

/**
 * Creates a Stripe Checkout Session for school subscriptions.
 * Adheres to Stripe best practices: Dynamic Payment Methods enabled,
 * customer reuse, and session tracking integration_identifier.
 */
export async function createSchoolSubscriptionCheckoutSession({
    schoolId,
    schoolName,
    userEmail,
    existingCustomerId,
    successUrl,
    cancelUrl,
    tierName = 'Enterprise Node Tier (Monthly)',
    amountCents = 4900,
}: CreateSubscriptionCheckoutParams): Promise<Stripe.Checkout.Session> {
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: schoolId,
        metadata: {
            schoolId,
            platform: 'LUCY_OS',
        },
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: tierName,
                        description: `Cloud operating tier for ${schoolName}`,
                        tax_code: 'txcd_10103000', // SaaS for educational institutions
                    },
                    unit_amount: amountCents,
                    recurring: {
                        interval: 'month',
                    },
                },
                quantity: 1,
            },
        ],
    };

    if (existingCustomerId) {
        sessionParams.customer = existingCustomerId;
    } else {
        sessionParams.customer_email = userEmail;
    }

    return await getStripe().checkout.sessions.create(sessionParams);
}

export interface CreateTuitionInvoiceParams {
    customerId: string;
    description: string;
    items: Array<{
        description: string;
        amountCents: number;
        currency?: string;
    }>;
    daysUntilDue?: number;
    metadata?: Record<string, string>;
}

/**
 * Creates and finalizes an itemized student tuition / school invoice.
 */
export async function createStudentTuitionInvoice({
    customerId,
    description,
    items,
    daysUntilDue = 30,
    metadata = {},
}: CreateTuitionInvoiceParams): Promise<Stripe.Invoice> {
    for (const item of items) {
        await getStripe().invoiceItems.create({
            customer: customerId,
            amount: item.amountCents,
            currency: item.currency || 'usd',
            description: item.description,
            metadata,
        });
    }

    const invoice = await getStripe().invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: daysUntilDue,
        description,
        metadata,
    });

    return await getStripe().invoices.finalizeInvoice(invoice.id);
}

/**
 * Creates a Stripe Terminal connection token for campus POS card readers.
 */
export async function createTerminalConnectionToken(): Promise<Stripe.Terminal.ConnectionToken> {
    return await getStripe().terminal.connectionTokens.create();
}

/**
 * Creates a Terminal in-person payment intent.
 * Note: Only in Terminal integrations is payment_method_types: ['card_present'] permitted.
 */
export async function createTerminalPaymentIntent(
    amountCents: number,
    currency: string = 'usd',
    metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> {
    return await getStripe().paymentIntents.create({
        amount: amountCents,
        currency,
        payment_method_types: ['card_present'],
        capture_method: 'automatic',
        metadata,
    });
}

/**
 * Creates a Stripe Identity Verification Session for institutional staff or parent KYC.
 */
export async function createIdentityVerificationSession(
    userId: string,
    userEmail: string,
    returnUrl: string,
    metadata: Record<string, string> = {}
): Promise<Stripe.Identity.VerificationSession> {
    return await getStripe().identity.verificationSessions.create({
        type: 'document',
        options: {
            document: {
                require_matching_selfie: true,
            },
        },
        return_url: returnUrl,
        metadata: {
            userId,
            userEmail,
            ...metadata,
        },
    });
}

/**
 * Creates a Stripe Financial Connections Session for institutional bank accounts.
 */
export async function createFinancialConnectionsSession(
    customerId: string,
    returnUrl: string
): Promise<Stripe.FinancialConnections.Session> {
    return await getStripe().financialConnections.sessions.create({
        account_holder: {
            type: 'customer',
            customer: customerId,
        },
        permissions: ['balances', 'ownership', 'payment_method', 'transactions'],
        return_url: returnUrl,
    });
}

/**
 * Creates an Issuing Cardholder and Virtual Card for departmental budgets or staff allowances.
 */
export async function createIssuingCardholderAndCard({
    name,
    email,
    monthlySpendingLimitCents,
    schoolId,
}: {
    name: string;
    email: string;
    monthlySpendingLimitCents: number;
    schoolId: string;
}): Promise<{ cardholder: Stripe.Issuing.Cardholder; card: Stripe.Issuing.Card }> {
    const cardholder = await getStripe().issuing.cardholders.create({
        name: name.slice(0, 24),
        email,
        phone_number: '+18005550199',
        status: 'active',
        type: 'individual',
        billing: {
            address: {
                line1: '123 Academic Campus Way',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94105',
                country: 'US',
            },
        },
        metadata: {
            schoolId,
        },
    });

    const card = await getStripe().issuing.cards.create({
        cardholder: cardholder.id,
        currency: 'usd',
        type: 'virtual',
        status: 'active',
        spending_controls: {
            spending_limits: [
                {
                    amount: monthlySpendingLimitCents,
                    interval: 'monthly',
                },
            ],
        },
        metadata: {
            schoolId,
        },
    });

    return { cardholder, card };
}
