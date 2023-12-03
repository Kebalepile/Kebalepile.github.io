import { HiMenuAlt3 } from "react-icons/hi";
export default function Menu() {
  return (
    <>
      <button className="menu">
        <HiMenuAlt3 className="menu-icon" />
      </button>
      <article id="menu-details">
        <ul>
          <li>Home</li>
          <li>Portfolio</li>
          <li>Contact</li>
        </ul>
      </article>
    </>
  );
}
