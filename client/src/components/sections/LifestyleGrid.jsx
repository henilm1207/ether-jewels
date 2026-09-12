// Live custom-content image cards: 2× half, square, 5px gap, no overlay text.
import ProtectedImage from '../ui/ProtectedImage';

export default function LifestyleGrid() {
  return (
    <section className="py-0 bg-white">
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 bg-white" style={{ gap: '5px' }}>
          <div className="overflow-hidden aspect-square">
            <ProtectedImage
              src="/images/lifestyle-1.jpg"
              alt="Etherstar Lifestyle"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden aspect-square">
            <ProtectedImage
              src="/images/lifestyle-2.jpg"
              alt="Etherstar Lifestyle"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
