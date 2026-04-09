"use client";

import { forwardRef } from "react";
import { format } from "date-fns";
import { calculateAge } from "@/lib/utils";

interface StudentData {
    id: string;
    firstName: string;
    lastName: string;
    studentCode: string;
    email?: string;
    dob?: string;
    photoUrl?: string;
    address?: string;
    guardianName?: string;
    guardianPhone?: string;
    guardianRelation?: string;
    secondaryPhone?: string;
    createdAt?: string;
    school?: { name: string; logoUrl?: string };
    class?: { name: string; grade?: { name: string } };
}

interface GradeRecord {
    score: string;
    exam?: { title: string; totalMarks: number };
    subject?: { name: string };
    createdAt?: string;
}

interface AttendanceData {
    total: number;
    present: number;
    late: number;
    absent: number;
    history: { date: string; status: string }[];
}

interface StudentDossierPrintProps {
    student: StudentData;
    grades: GradeRecord[];
    attendance: AttendanceData;
    remarks: { content: string; teacher?: { name: string }; createdAt?: string }[];
}

export const StudentDossierPrint = forwardRef<HTMLDivElement, StudentDossierPrintProps>(
    ({ student, grades, attendance, remarks }, ref) => {
        const fullName = `${student.firstName} ${student.lastName}`;
        const attendancePct = attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : 100;
        const schoolName = student.school?.name || "LUCY ACADEMY";
        const schoolLogo = student.school?.logoUrl;
        const now = new Date();

        const bySubject = grades.reduce((acc: Record<string, GradeRecord[]>, g: GradeRecord) => {
            const key = g.subject?.name || "General";
            if (!acc[key]) acc[key] = [];
            acc[key].push(g);
            return acc;
        }, {});

        const getGrade = (pct: number) => {
            if (pct >= 90) return { letter: "A+", color: "#16a34a" };
            if (pct >= 80) return { letter: "A", color: "#22c55e" };
            if (pct >= 70) return { letter: "B", color: "#3b82f6" };
            if (pct >= 60) return { letter: "C", color: "#ca8a04" };
            if (pct >= 50) return { letter: "D", color: "#ea580c" };
            return { letter: "F", color: "#dc2626" };
        };

        const overallPct = grades.length > 0
            ? Math.round(grades.reduce((acc: number, g: GradeRecord) => {
                const scoreNum = parseFloat(g.score) || 0;
                const p = g.exam?.totalMarks ? (scoreNum / g.exam.totalMarks) * 100 : scoreNum;
                return acc + p;
            }, 0) / grades.length)
            : null;

        const overall = overallPct !== null ? getGrade(overallPct) : null;


        const TH: React.CSSProperties = {
            padding: "4px 8px",
            fontSize: "7pt",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#666",
            textAlign: "left",
            background: "#f0f0f0",
            borderBottom: "1px solid #ddd",
            whiteSpace: "nowrap",
        };
        const TD: React.CSSProperties = {
            padding: "4px 8px",
            fontSize: "8pt",
            borderBottom: "1px solid #f0f0f0",
            verticalAlign: "middle",
        };

        return (
            <div ref={ref}>
                {/* A4 print CSS */}
                <style>{`
                    @page {
                        size: A4 portrait;
                        margin: 12mm 14mm;
                    }
                    @media print {
                        html, body {
                            width: 210mm;
                            margin: 0;
                            padding: 0;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                        }
                        * {
                            box-sizing: border-box;
                        }
                        table { page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        .no-break { page-break-inside: avoid; }
                    }
                `}</style>

                <div style={{ fontFamily: "Arial, Helvetica, sans-serif", color: "#111", background: "#fff", width: "100%", fontSize: "9pt", lineHeight: 1.45 }}>

                    {/* ── HEADER ── */}
                    <div className="no-break" style={{ background: "#09090b", color: "#fff", padding: "8mm 10mm", display: "flex", alignItems: "center", gap: "6mm", marginBottom: "5mm" }}>
                        {/* School logo */}
                        <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 8, overflow: "hidden", background: "#1c1c1e", border: "1px solid #22c55e30", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {schoolLogo
                                ? <img src={schoolLogo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                : <span style={{ color: "#22c55e", fontWeight: 900, fontSize: "18pt" }}>L</span>}
                        </div>

                        {/* Student photo */}
                        <div style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 8, overflow: "hidden", background: "#27272a", border: "1px solid #3f3f46", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {student.photoUrl
                                ? <img src={student.photoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <span style={{ fontSize: "18pt", fontWeight: 900, color: "#3f3f46" }}>{student.firstName?.[0]}{student.lastName?.[0]}</span>}
                        </div>

                        {/* Name + meta */}
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "15pt", fontWeight: 900, letterSpacing: "-0.02em", textTransform: "uppercase", lineHeight: 1 }}>
                                {student.firstName} <span style={{ color: "#52525b" }}>{student.lastName}</span>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: 5 }}>
                                {[
                                    ["ID", student.studentCode],
                                    ["Class", `${student.class?.grade?.name || "—"} · ${student.class?.name || "—"}`],
                                    ["Gender", student.gender || "—"],
                                    ["Age", student.dob ? `${calculateAge(student.dob)}Y` : "—"],
                                    ["Enrolled", student.createdAt ? format(new Date(student.createdAt), "MMM yyyy") : "—"],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <div style={{ fontSize: "5.5pt", color: "#71717a", letterSpacing: "0.15em", textTransform: "uppercase" }}>{label}</div>
                                        <div style={{ fontSize: "7.5pt", fontWeight: 700, color: "#e4e4e7" }}>{value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Overall badge */}
                        {overall && (
                            <div style={{ textAlign: "center", flexShrink: 0 }}>
                                <div style={{ width: 50, height: 50, borderRadius: 8, background: "#18181b", border: `1px solid ${overall.color}50`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ fontSize: "17pt", fontWeight: 900, color: overall.color, lineHeight: 1 }}>{overall.letter}</span>
                                    <span style={{ fontSize: "6pt", color: "#71717a" }}>{overallPct}%</span>
                                </div>
                                <div style={{ fontSize: "5.5pt", color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>Overall</div>
                            </div>
                        )}

                        {/* Right stamps */}
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "5.5pt", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.12em" }}>{schoolName}</div>
                            <div style={{ fontSize: "6pt", fontWeight: 700, color: "#a1a1aa", marginTop: 2 }}>{format(now, "dd MMM yyyy")}</div>
                            <div style={{ marginTop: 4, display: "inline-block", padding: "1px 7px", background: "#22c55e15", border: "1px solid #22c55e40", borderRadius: 99, fontSize: "5pt", color: "#22c55e", letterSpacing: "0.15em", textTransform: "uppercase" }}>Confidential</div>
                        </div>
                    </div>

                    {/* ── STAT BAR ── */}
                    <div className="no-break" style={{ display: "flex", background: "#f5f5f5", border: "1px solid #e5e5e5", borderRadius: 6, marginBottom: "5mm" }}>
                        {[
                            ["Attendance", `${attendancePct}%`, `${attendance.present}/${attendance.total} days`],
                            ["Total Assessments", String(grades.length), "Grade records"],
                            ["Faculty Remarks", String(remarks.length), "Written observations"],
                            ["Guardian", student.guardianName || "—", student.guardianPhone || ""],
                        ].map(([label, value, sub], i) => (
                            <div key={i} style={{ flex: 1, padding: "5px 10px", borderLeft: i > 0 ? "1px solid #e0e0e0" : "none" }}>
                                <div style={{ fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.15em", color: "#888" }}>{label}</div>
                                <div style={{ fontSize: "12pt", fontWeight: 900, color: "#111", lineHeight: 1.1 }}>{value}</div>
                                <div style={{ fontSize: "5.5pt", color: "#aaa" }}>{sub}</div>
                            </div>
                        ))}
                    </div>

                    {/* ── PERSONAL INFO ── */}
                    <div className="no-break" style={{ marginBottom: "5mm" }}>
                        <SectionHeader title="Personal Information" color="#22c55e" />
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px 16px" }}>
                            <F label="Full Name" value={fullName} />
                            <F label="Email" value={student.email || "—"} />
                            <F label="Date of Birth" value={student.dob ? format(new Date(student.dob), "dd MMM yyyy") : "—"} />
                            <F label="Address" value={student.address || "—"} />
                            <F label="Guardian" value={`${student.guardianName || "—"} (${student.guardianRelation || "Guardian"})`} />
                            <F label="Phone" value={`${student.guardianPhone || "—"}${student.secondaryPhone ? ` / ${student.secondaryPhone}` : ""}`} />
                        </div>
                    </div>

                    {/* ── ACADEMIC PERFORMANCE ── */}
                    <div style={{ marginBottom: "5mm" }}>
                        <SectionHeader title="Academic Performance" color="#3b82f6" />
                        {grades.length === 0 ? (
                            <p style={{ fontSize: "7.5pt", color: "#aaa", fontStyle: "italic" }}>No academic records available.</p>
                        ) : (
                            <>
                                {/* Subject summary */}
                                <div className="no-break" style={{ marginBottom: 8 }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                        <thead>
                                            <tr>
                                                <th style={TH}>Subject</th>
                                                <th style={TH}>Count</th>
                                                <th style={{ ...TH, width: "40%" }}>Avg %</th>
                                                <th style={TH}>Grade</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(bySubject).map(([subj, gs], i) => {
                                                const avg = Math.round(gs.reduce((acc: number, g: GradeRecord) => {
                                                    const scoreNum = parseFloat(g.score) || 0;
                                                    const p = g.exam?.totalMarks ? (scoreNum / g.exam.totalMarks) * 100 : scoreNum;
                                                    return acc + p;
                                                }, 0) / gs.length);
                                                const g = getGrade(avg);
                                                return (
                                                    <tr key={subj} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                        <td style={{ ...TD, fontWeight: 700 }}>{subj}</td>
                                                        <td style={TD}>{gs.length}</td>
                                                        <td style={TD}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                                <div style={{ flex: 1, height: 4, background: "#e8e8e8", borderRadius: 2, overflow: "hidden" }}>
                                                                    <div style={{ width: `${avg}%`, height: "100%", background: g.color, borderRadius: 2 }} />
                                                                </div>
                                                                <span style={{ fontWeight: 700, minWidth: 28 }}>{avg}%</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ ...TD, fontWeight: 900, color: g.color }}>{g.letter}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Detailed records */}
                                <div style={{ fontSize: "6pt", textTransform: "uppercase", letterSpacing: "0.15em", color: "#999", marginBottom: 4 }}>Detailed Assessment Records</div>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            <th style={TH}>Assessment</th>
                                            <th style={TH}>Subject</th>
                                            <th style={TH}>Score</th>
                                            <th style={TH}>Max</th>
                                            <th style={TH}>%</th>
                                            <th style={TH}>Grade</th>
                                            <th style={TH}>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grades.map((g, i) => {
                                            const pct = g.exam?.totalMarks ? Math.round((parseFloat(g.score) / g.exam.totalMarks) * 100) : null;
                                            const gr = pct !== null ? getGrade(pct) : null;
                                            return (
                                                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                                    <td style={{ ...TD, fontWeight: 600 }}>{g.exam?.title || "Assessment"}</td>
                                                    <td style={TD}>{g.subject?.name}</td>
                                                    <td style={{ ...TD, fontWeight: 700 }}>{g.score}</td>
                                                    <td style={{ ...TD, color: "#888" }}>{g.exam?.totalMarks || "—"}</td>
                                                    <td style={{ ...TD, fontWeight: 700, color: gr?.color || "#111" }}>{pct !== null ? `${pct}%` : "—"}</td>
                                                    <td style={{ ...TD, fontWeight: 900, color: gr?.color || "#111" }}>{gr?.letter || "—"}</td>
                                                    <td style={{ ...TD, color: "#888" }}>{g.createdAt ? format(new Date(g.createdAt), "dd MMM yy") : "—"}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>

                    {/* ── ATTENDANCE ── */}
                    <div style={{ marginBottom: "5mm" }}>
                        <SectionHeader title="Attendance" color="#f59e0b" />
                        <div className="no-break" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                            {([
                                ["Total", attendance.total, "#111"],
                                ["Present", attendance.present, "#22c55e"],
                                ["Absent", attendance.absent, "#dc2626"],
                                ["Late", attendance.late, "#ea580c"],
                                ["Rate", `${attendancePct}%`, attendancePct >= 80 ? "#22c55e" : attendancePct >= 60 ? "#ca8a04" : "#dc2626"],
                            ] as [string, string | number, string][]).map(([lbl, val, col]) => (
                                <div key={lbl} style={{ flex: 1, padding: "6px 8px", background: "#f8f8f8", border: "1px solid #ebebeb", borderRadius: 6, textAlign: "center" }}>
                                    <div style={{ fontSize: "13pt", fontWeight: 900, color: col, lineHeight: 1 }}>{val}</div>
                                    <div style={{ fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.12em", color: "#999", marginTop: 2 }}>{lbl}</div>
                                </div>
                            ))}
                        </div>

                        {attendance.history.length > 0 && (
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr>
                                        <th style={TH}>Date</th>
                                        <th style={TH}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendance.history.map((rec, i) => (
                                        <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                                            <td style={TD}>{format(new Date(rec.date), "EEE, dd MMM yyyy")}</td>
                                            <td style={{ ...TD, fontWeight: 700, color: rec.status === "PRESENT" ? "#22c55e" : rec.status === "ABSENT" ? "#dc2626" : "#ea580c" }}>{rec.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* ── REMARKS ── */}
                    {remarks.length > 0 && (
                        <div style={{ marginBottom: "5mm" }}>
                            <SectionHeader title="Faculty Remarks" color="#8b5cf6" />
                            {remarks.map((r, i) => (
                                <div className="no-break" key={i} style={{ marginBottom: 5, padding: "5px 8px", background: "#fafafa", borderLeft: "3px solid #8b5cf650", borderRadius: "0 5px 5px 0" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                        <span style={{ fontSize: "6.5pt", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#555" }}>{r.teacher?.name || "Faculty"}</span>
                                        <span style={{ fontSize: "6pt", color: "#aaa" }}>{r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy") : ""}</span>
                                    </div>
                                    <p style={{ fontSize: "7.5pt", color: "#444", margin: 0, fontStyle: "italic" }}>&ldquo;{r.content}&rdquo;</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ── FOOTER ── */}
                    <div style={{ marginTop: "6mm", paddingTop: "4mm", borderTop: "1px solid #e8e8e8", display: "flex", justifyContent: "space-between", fontSize: "6pt", color: "#bbb", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        <span>{schoolName} · Official Academic Dossier · Confidential</span>
                        <span>Generated {format(now, "dd MMM yyyy, HH:mm")} · LUCY OS</span>
                    </div>
                </div>
            </div>
        );
    }
);

StudentDossierPrint.displayName = "StudentDossierPrint";

function SectionHeader({ title, color }: { title: string; color: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <div style={{ width: 3, height: 12, background: color, borderRadius: 2, flexShrink: 0 }} />
            <div style={{ fontSize: "6.5pt", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.2em", color: "#222" }}>{title}</div>
            <div style={{ flex: 1, height: 1, background: "#e8e8e8" }} />
        </div>
    );
}

function F({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: "5.5pt", textTransform: "uppercase", letterSpacing: "0.12em", color: "#999" }}>{label}</div>
            <div style={{ fontSize: "8pt", fontWeight: 600, color: "#1a1a1a" }}>{value}</div>
        </div>
    );
}
