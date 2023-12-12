import email from "../assets/img/email.svg";
import facebook from "../assets/img/facebook.svg";
import twitter from "../assets/img/twitter.svg";
import github from "../assets/img/github.svg";
import { PiTelegramLogoThin } from "react-icons/pi";

export default function MediaHandles() {
  return (
    <section className="social-media-handles">
      <a
        className="media-handle"
        target="_blank"
        rel="noopener noreferrer"
        href="mailto:kmotshoana@gmail.com"
        title="kmotshoana@gmail.com"
      >
        <img src={email} alt="social media emoji" />
      </a>

      <a
        className="media-handle"
        href="https://m.facebook.com/profile.php/?id=61554153384198"
        target="_blank"
        rel="noopener noreferrer"
        title="https://m.facebook.com/profile.php/?id=61554153384198"
      >
        <img src={facebook} alt="social media emoji" />
      </a>
      <a
        className="media-handle"
        href="https://twitter.com/Tmotshoana"
        target="_blank"
        rel="noopener noreferrer"
        title="https://twitter.com/Tmotshoana"
      >
        <img src={twitter} alt="social media emoji" />
      </a>
      <a
        className="media-handle"
        href="https://github.com/Kebalepile"
        target="_blank"
        rel="noopener noreferrer"
        title="https://github.com/Kebalepile"
      >
        <img src={github} alt="social media emoji" />
      </a>
      <a
        className="media-handle"
        href="https://t.me/Kebalepile_1"
        target="_blank"
        rel="noopener noreferrer"
        title="https://t.me/Kebalepile_1"
      >
        <PiTelegramLogoThin style={{ width: "36px", height: "36px" }} />
      </a>
    </section>
  );
}
