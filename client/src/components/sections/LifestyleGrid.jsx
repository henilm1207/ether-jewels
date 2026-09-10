export default function LifestyleGrid() {
  return (
    <section className="py-0 bg-white">
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px] bg-white">
          <div className="overflow-hidden aspect-square group cursor-pointer">
            <img
              src="/images/lifestyle-1.jpg"
              alt="MITVA Lifestyle"
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-900 ease-out group-hover:scale-105"
            />
          </div>
          <div className="overflow-hidden aspect-square group cursor-pointer">
            <img
              src="/images/lifestyle-2.jpg"
              alt="MITVA Lifestyle"
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-900 ease-out group-hover:scale-105"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
