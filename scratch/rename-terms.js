const fs = require('fs');
const path = require('path');

const replacements = [
    {
        file: 'components/dashboard/finance-view.tsx',
        changes: [
            { from: 'Autonomous Resource Controller & Billing Terminal', to: 'Resource & Billing Controller' },
            { from: 'Expense Nexus (Payroll)', to: 'Payroll & Expenses' },
            { from: 'Verification <span className="text-amber-600 dark:text-amber-500 not-italic">Nexus</span>', to: 'Payment <span className="text-amber-600 dark:text-amber-500 not-italic">Verification</span>' }
        ]
    },
    {
        file: 'components/dashboard/student-view.tsx',
        changes: [
            { from: 'Active Institutional Uplink & Neural Terminal', to: 'Student Portal & Active Connection' }
        ]
    },
    {
        file: 'components/dashboard/books-view.tsx',
        changes: [
            { from: 'Learning <span className="text-eduGreen-500 not-italic">Nexus</span>', to: 'Learning <span className="text-eduGreen-500 not-italic">Center</span>' }
        ]
    },
    {
        file: 'components/dashboard/role-tutorial.tsx',
        changes: [
            { from: '"Expense Nexus"', to: '"Expenses"' },
            { from: '"Achievement Nexus"', to: '"Achievements"' },
            { from: '"Verification Nexus"', to: '"Verifications"' }
        ]
    },
    {
        file: 'components/dashboard/report-card-print.tsx',
        changes: [
            { from: '"Educational Nexus"', to: '"Institution"' }
        ]
    },
    {
        file: 'components/dashboard/parent-billing-view.tsx',
        changes: [
            { from: 'Family Financial Terminal & Protocol Monitor', to: 'Family Financial Overview' },
            { from: 'No Student Profiles Linked to Terminal', to: 'No Student Profiles Linked to Account' }
        ]
    },
    {
        file: 'components/dashboard/authorization-request-modal.tsx',
        changes: [
            { from: 'Authorization Matrix Protocol v1', to: 'Authorization System' }
        ]
    }
];

replacements.forEach(({ file, changes }) => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf-8');
        changes.forEach(({ from, to }) => {
            content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
        });
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    } else {
        console.error(`File not found: ${file}`);
    }
});
