export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Dashboard</h1>
      <div className="flex flex-col items-center justify-center py-32 text-center text-gray-400">
        <p className="text-2xl font-medium text-gray-500 mb-2">No visits yet.</p>
        <p className="text-base">Waiting for agents to check in.</p>
      </div>
    </div>
  );
}
