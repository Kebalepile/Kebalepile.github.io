import email from "../assets/img/email.svg";
import facebook from "../assets/img/facebook.svg";
import twitter from "../assets/img/twitter.svg";

export default function About() {
  return (
    <div className="card">
      <h2 className="greet">
        Hey! My Name is <span className="key-point"> Keba.</span>
        <br />I am a web developer based in{" "}
        <span className="key-point">
          {" "}
          Rusternburg, North West, South Africa.
        </span>
      </h2>
      <br />
      <p className="details">
        I have been working as a freelance designer and web developer since
        2018. I’ve always been someone who has both a creative and a logical
        side. When I discovered web development in university, I realized it
        would be the perfect fit. I could use my creative side to design and my
        logical side to code. As a bonus, being both designer and developer
        allows me to make sure no detail is lost in translation.
      </p>
      <br />
      <section className="social-media-handles">
        <a
          className="media-handle"
          href="#"
          target="_blank"
          title="kmotshoana@gmail.com"
        >
          <img src={email} alt="social media emoji" />
        </a>

        <a
          className="media-handle"
          href="#"
          target="_blank"
          title="facebook profile link"
        >
          <img src={facebook} alt="social media emoji" />
        </a>
        <a
          className="media-handle"
          href="#"
          target="_blank"
          title="twitter handle"
        >
          <img src={twitter} alt="social media emoji" />
        </a>
      </section>
      <br />
    </div>
  );
}
