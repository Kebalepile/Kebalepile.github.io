import Menu from "./Menu";
import About from "./About";
import HustleInfo from "./HustleInfo";
import Projects from "./Projects";
import Footer from "./Footer";
export default function Main() {
  return (
    <>
   
      <Menu />
      <section className="banner card"></section>
      <About />
      <HustleInfo />
      <Projects />
      <Footer />
    </>
  );
}
