'use client';

import Header from "@/components/Header";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
    return (
        <>
            <Header />
            <main className="main admin-main">
                <div className="hero">
                    <h1>Admin Dashboard</h1>
                    <p>Manage prediction market rounds</p>
                </div>
                <AdminPanel />
                <footer className="footer">
                    <p><a href="/">← Back to Betting</a></p>
                </footer>
            </main>
        </>
    );
}
