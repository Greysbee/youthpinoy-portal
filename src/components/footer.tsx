export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-sm text-brand-muted md:flex-row md:justify-between">
          <p>© {new Date().getFullYear()} YouthPinoy. All rights reserved.</p>
          <p>Equipping online missionaries through digital trainings.</p>
        </div>
      </div>
    </footer>
  );
}
