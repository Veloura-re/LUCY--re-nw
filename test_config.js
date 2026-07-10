const config1 = "{\"replyTo\": \"\", \"sendInvites\": true, \"sendReports\": true, \"sendInvoices\": true}";
const c1 = config1;
console.log(c1.sendInvites === false);

const c2 = JSON.parse(config1);
console.log(c2.sendInvites === false);
