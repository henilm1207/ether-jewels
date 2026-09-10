export default function LifestyleGrid() {
  return (
    <section className="py-0">
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="overflow-hidden aspect-square group cursor-pointer">
            <img
              src="/images/lifestyle-1.jpg"
              alt="MITVA Lifestyle"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
          <div className="overflow-hidden aspect-square group cursor-pointer">
            <img
              src="/images/lifestyle-2.jpg"
              alt="MITVA Lifestyle"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
