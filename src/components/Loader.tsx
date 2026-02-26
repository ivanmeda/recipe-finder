export default function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full bg-terracotta"
            style={{
              animation: "bounce 0.6s infinite alternate",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes bounce {
          to {
            transform: translateY(-12px);
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
