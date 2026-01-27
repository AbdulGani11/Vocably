const Logo = () => {
  return (
    <div className="flex items-center gap-2 cursor-pointer z-20">
      <div className="flex items-center gap-0.5 h-5">
        {[3, 7, 4, 8, 5, 7, 3].map((height, i) => (
          <div
            key={i}
            className="w-0.5 bg-neutral-800 rounded-full transition-all hover:bg-purple-600"
            style={{ height: `${height * 2}px` }}
          />
        ))}
      </div>
      <span className="text-xl font-semibold tracking-tight text-neutral-800">
        Vocably
      </span>
    </div>
  );
};

export default Logo;
