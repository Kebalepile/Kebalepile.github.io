import { HiMenuAlt3 } from "react-icons/hi";
export default function Menu() {
  return (
    <>
      <button className="menu">
        <HiMenuAlt3 className="menu-icon" />
      </button>
      <article id="menu-details">
        <ul>
          <li>
            <a href="#home">Home</a>
          </li>
          <li>
            <a href="#repos">Portfolio</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
        </ul>
      </article>
    </>
  );
}
