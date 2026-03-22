export function App() {
  return (
    <div className="mx-auto max-w-lg p-6 font-sans text-slate-800">
      <h1 className="text-xl font-semibold">PriceGuard</h1>
      <p className="mt-2 text-sm text-slate-600">
        API backend mặc định: <code className="rounded bg-slate-100 px-1">http://localhost:3000</code>.
        Đặt biến môi trường <code className="rounded bg-slate-100 px-1">VITE_API_URL</code> khi build extension
        nếu cần URL khác.
      </p>
    </div>
  );
}
