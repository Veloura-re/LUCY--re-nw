"use client";

import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Configure steps based on role
const getStepsForRole = (role: string) => {
    switch (role) {
        case 'PRINCIPAL':
        case 'SUPERADMIN':
            return [
                { popover: { title: 'Welcome to LUCY OS', description: 'This interactive tour will guide you through your new administrative dashboard.', align: 'start' as const } },
                { element: '#nav-teachers', popover: { title: 'Faculty Registry', description: 'Invite and manage all teachers from this terminal.' } },
                { element: '#nav-students', popover: { title: 'Student Databanks', description: 'View and manage all enrolled students across the institution.' } },
                { element: '#nav-classes', popover: { title: 'Cohort Configurations', description: 'Create classes, grades, and assign homeroom teachers.' } },
                { element: '#nav-staffing', popover: { title: 'Faculty Mapping', description: 'Assign teachers to subjects and set their weekly period requirements.' } },
                { element: '#nav-timetable', popover: { title: 'Auto-Scheduler', description: 'Generate the entire school schedule instantly using the AI engine.' } },
                { element: '#nav-finance', popover: { title: 'Fiscal Ledger', description: 'Monitor institutional revenue and fee collection.' } },
                { element: '#nav-settings', popover: { title: 'System Parameters', description: 'Configure school-wide settings and run database backups here.' } },
                { element: '#nav-help-center', popover: { title: 'Guideline Book', description: 'Access the complete interactive manual anytime you need assistance.' } }
            ];
        case 'TEACHER':
        case 'HOMEROOM':
            return [
                { popover: { title: 'Welcome Instructor', description: 'This interactive tour will guide you through your neural classroom interface.' } },
                { element: '#nav-overview', popover: { title: 'Tactical Overview', description: 'Your daily schedule and upcoming classes appear here.' } },
                { element: '#nav-add-exam', popover: { title: 'Assessment Uplink', description: 'Create exams and log grades to the neural grid.' } },
                { element: '#nav-attendance', popover: { title: 'Attendance', description: 'Take high-precision tactical attendance for your classes.' } },
                { element: '#nav-messages', popover: { title: 'Communications', description: 'Secure messaging with parents and administration.' } },
                { element: '#nav-help-center', popover: { title: 'Guideline Book', description: 'Access the complete interactive manual anytime you need assistance.' } }
            ];
        default:
            return [
                { popover: { title: 'Welcome', description: 'Explore your new dashboard.' } },
                { element: '#nav-help-center', popover: { title: 'Guideline Book', description: 'Access the complete interactive manual anytime you need assistance.' } }
            ];
    }
};

export function InteractiveTour({ role }: { role: string }) {
    useEffect(() => {
        const hasSeenTour = localStorage.getItem(`interactive_tour_seen_${role}`);
        
        // Listen for manual trigger
        const handleOpenTour = () => {
            const steps = getStepsForRole(role);
            const driverObj = driver({
                showProgress: true,
                steps: steps,
                popoverClass: 'lucy-driver-theme'
            });
            driverObj.drive();
        };

        window.addEventListener('lucy:open-tour', handleOpenTour);

        if (!hasSeenTour) {
            const timer = setTimeout(() => {
                const steps = getStepsForRole(role);
                const driverObj = driver({
                    showProgress: true,
                    steps: steps,
                    popoverClass: 'lucy-driver-theme',
                    onDestroyStarted: () => {
                        localStorage.setItem(`interactive_tour_seen_${role}`, 'true');
                        driverObj.destroy();
                    }
                });
                driverObj.drive();
            }, 1500);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('lucy:open-tour', handleOpenTour);
            };
        }

        return () => window.removeEventListener('lucy:open-tour', handleOpenTour);
    }, [role]);

    return null; // This component just injects logic
}
