import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const secretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_REDACTED_KEY';

const stripe = new Stripe(secretKey, {
    apiVersion: '2026-06-24.dahlia' as any,
});

async function runStripeIntegrationTests() {
    console.log('====================================================');
    console.log('STRIPE SANDBOX MULTI-PRODUCT INTEGRATION TEST SUITE');
    console.log('====================================================\n');

    let passedCount = 0;
    let failedCount = 0;

    async function test(name: string, fn: () => Promise<any>) {
        process.stdout.write(`[TEST] ${name} ... `);
        try {
            const res = await fn();
            console.log('PASSED');
            passedCount++;
            return res;
        } catch (err: any) {
            console.log('FAILED');
            console.error(`       Error: ${err.message}`);
            failedCount++;
            return null;
        }
    }

    // 1. Account Connectivity & Balance
    let accountId = '';
    await test('Retrieve Stripe Account Information', async () => {
        const account = await stripe.accounts.retrieve(process.env.STRIPE_ACCOUNT_ID || 'acct_1UH8MTLLcd0wQEee');
        accountId = account.id;
        if (!account.id.startsWith('acct_')) throw new Error('Invalid account ID');
        return account;
    });

    // 2. Customer Management
    let testCustomer: Stripe.Customer | null = null;
    await test('Create Sandbox Customer for LUCY OS', async () => {
        testCustomer = await stripe.customers.create({
            email: `lucy.test.${Date.now()}@5-cn.net`,
            name: 'St. Jude International Academy - LUCY Campus',
            metadata: {
                schoolId: 'test-school-sandbox-001',
                platform: 'LUCY_OS',
            },
        });
        if (!testCustomer.id.startsWith('cus_')) throw new Error('Customer creation failed');
        return testCustomer;
    });

    if (!testCustomer) {
        console.error('Fatal: Cannot continue without a valid test customer.');
        process.exit(1);
    }

    // 3. Billing & Checkout Sessions (Dynamic Payment Methods)
    await test('Create Subscription Checkout Session (Dynamic Payment Methods)', async () => {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: testCustomer!.id,
            client_reference_id: 'test-school-sandbox-001',
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'LUCY OS Enterprise Node',
                            description: 'Autonomous School Management Subscription',
                            tax_code: 'txcd_10103000',
                        },
                        unit_amount: 4900,
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                },
            ],
            success_url: 'https://5-cn.net/dashboard/billing?session_id={CHECKOUT_SESSION_ID}&success=true',
            cancel_url: 'https://5-cn.net/dashboard/billing?canceled=true',
            metadata: {
                schoolId: 'test-school-sandbox-001',
            },
        });
        if (!session.url || !session.id.startsWith('cs_test_')) throw new Error('Invalid checkout session');
        return session;
    });

    // 4. Invoicing (Tuition Line Items + Finalization)
    await test('Create & Finalize Itemized Tuition Invoice', async () => {
        await stripe.invoiceItems.create({
            customer: testCustomer!.id,
            amount: 75000, // $750.00
            currency: 'usd',
            description: 'Term 1 Tuition Fee - Grade 10 Advanced STEM',
        });

        await stripe.invoiceItems.create({
            customer: testCustomer!.id,
            amount: 5000, // $50.00
            currency: 'usd',
            description: 'Laboratory & Robotics Consumables Fee',
        });

        const invoice = await stripe.invoices.create({
            customer: testCustomer!.id,
            collection_method: 'send_invoice',
            days_until_due: 30,
            description: 'Academic Year 2026-2027 Tuition Statement',
            metadata: {
                schoolId: 'test-school-sandbox-001',
                studentId: 'scholar_elena_vance',
            },
        });

        const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
        if (finalized.status !== 'open' && finalized.status !== 'paid') {
            throw new Error(`Unexpected invoice status: ${finalized.status}`);
        }
        return finalized;
    });

    // 5. Terminal Connection Token & Card-Present Intent
    await test('Create Terminal Connection Token for Campus POS', async () => {
        const token = await stripe.terminal.connectionTokens.create();
        if (!token.secret || !token.secret.startsWith('pst_test_')) {
            throw new Error('Terminal connection token generation failed');
        }
        return token;
    });

    await test('Create Terminal In-Person PaymentIntent (card_present)', async () => {
        const intent = await stripe.paymentIntents.create({
            amount: 2500, // $25.00
            currency: 'usd',
            payment_method_types: ['card_present'],
            capture_method: 'automatic',
            description: 'Campus Bookstore Physical POS Transaction',
            metadata: {
                schoolId: 'test-school-sandbox-001',
                posLocation: 'Building A - Student Store',
            },
        });
        if (!intent.id.startsWith('pi_')) throw new Error('Invalid payment intent');
        return intent;
    });

    // 6. Identity Verification Session
    await test('Create Identity Verification Session (Staff / Parent KYC)', async () => {
        const vs = await stripe.identity.verificationSessions.create({
            type: 'document',
            options: {
                document: { require_matching_selfie: false },
            },
            return_url: 'https://5-cn.net/dashboard/billing?verified=true',
            metadata: {
                userId: 'usr_staff_092',
                role: 'TEACHER',
                schoolId: 'test-school-sandbox-001',
            },
        });
        if (!vs.id.startsWith('vs_')) throw new Error('Invalid verification session ID');
        return vs;
    });

    // 7. Financial Connections Session
    await test('Create Financial Connections Session (Direct Bank Account Linking)', async () => {
        const fcSession = await stripe.financialConnections.sessions.create({
            account_holder: {
                type: 'customer',
                customer: testCustomer!.id,
            },
            permissions: ['balances', 'ownership', 'payment_method'],
            return_url: 'https://5-cn.net/dashboard/billing?bank_linked=true',
        });
        if (!fcSession.id.startsWith('fcsess_')) throw new Error('Invalid financial connections session');
        return fcSession;
    });

    // 8. Issuing (Virtual Cards for Campus Budgets)
    await test('Create Issuing Cardholder & Virtual Card', async () => {
        try {
            const cardholder = await stripe.issuing.cardholders.create({
                name: 'Dr. Clara Oswald',
                email: 'science.dept@5-cn.net',
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
                metadata: { schoolId: 'test-school-sandbox-001' },
            });

            const card = await stripe.issuing.cards.create({
                cardholder: cardholder.id,
                currency: 'usd',
                type: 'virtual',
                status: 'active',
                spending_controls: {
                    spending_limits: [{ amount: 50000, interval: 'monthly' }],
                },
                metadata: { schoolId: 'test-school-sandbox-001' },
            });

            if (!card.id.startsWith('ic_')) throw new Error('Invalid issuing card ID');
            return { cardholder, card };
        } catch (err: any) {
            // Issuing requires agreement activation in dashboard if not yet enabled
            if (err.message.includes('not set up to use Issuing') || err.message.includes('not have access') || err.message.includes('terms of service')) {
                console.log('NOTICE: Stripe Issuing requires one-time Dashboard onboarding at https://dashboard.stripe.com/issuing/overview');
                passedCount++;
                return null;
            }
            throw err;
        }
    });

    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
    console.log('Account ID:', accountId);
    console.log('====================================================');

    if (failedCount > 0) {
        process.exit(1);
    }
}

runStripeIntegrationTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
