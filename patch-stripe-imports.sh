for file in app/api/school/billing/financial-connections/route.ts app/api/school/billing/invoices/route.ts app/api/webhooks/stripe/route.ts; do
  sed -i 's/import { stripe/import { getStripe/g' $file
  sed -i 's/import { stripe,/import { getStripe,/g' $file
  sed -i 's/import { createFinancialConnectionsSession, stripe }/import { createFinancialConnectionsSession, getStripe }/g' $file
  sed -i 's/stripe\./getStripe()\./g' $file
  sed -i 's/stripe(/getStripe()(/g' $file
done
