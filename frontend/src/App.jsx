import Navbar from "./components/Navbar/Navbar";
import Hero from "./pages/Hero";

function App() {
  return (
    <div className="relative flex h-dvh flex-col w-full bg-linear-to-br from-neutral-50 via-amber-50/30 to-white font-sans text-neutral-900 selection:bg-purple-200 overflow-hidden">
      <Navbar />
      <main className="grow w-full overflow-y-auto">
        <Hero />
      </main>
    </div>
  );
}

export default App;
