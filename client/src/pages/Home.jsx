import HeroSlideshow from '../components/sections/HeroSlideshow';
import ShopByShape from '../components/sections/ShopByShape';
import NewArrivals from '../components/sections/NewArrivals';
import TrustBadges from '../components/sections/TrustBadges';
import LifestyleGrid from '../components/sections/LifestyleGrid';
import GoldComparison from '../components/sections/GoldComparison';
import EtherstarExperience from '../components/sections/EtherstarExperience';

export default function Home() {
  return (
    <>
      <HeroSlideshow />
      <ShopByShape />
      <NewArrivals />
      <TrustBadges />
      <LifestyleGrid />
      <GoldComparison />
      <EtherstarExperience />
    </>
  );
}
