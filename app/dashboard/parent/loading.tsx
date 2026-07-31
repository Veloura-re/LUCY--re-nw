import SpringingLoader from "@/components/dashboard/springing-loader";

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <SpringingLoader message="Syncing Family Node System..." />
        </div>
    );
}
