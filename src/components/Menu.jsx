import { useState } from "react";
import { HiMenuAlt3, HiOutlineXCircle } from "react-icons/hi";

export default function Menu() {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <>
      <button className="menu" onClick={toggleMenu}>
        {menuOpen ? (
          <HiOutlineXCircle
            className="menu-icon"
            style={{ width: "40px", height: "40px" }}
          />
        ) : (
          <HiMenuAlt3 className="menu-icon" />
        )}
      </button>
      <article id="menu-details" className={menuOpen ? "open" : ""}>
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
