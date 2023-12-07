import MediaHandles from "./MediaHandles";

export default function About() {
  return (
    <div id="about" className="card animation">
      <h2 className="greet pad">
        Hey! My Name is <span className="key-point"> Keba.</span>
        <br />I am a web developer based in{" "}
        <span className="key-point">
          {" "}
          Rusternburg, North West, South Africa.
        </span>
      </h2>
      <br />
      <p className="details pad">
        I have been working as a freelance designer and web developer since
        2018. I’ve always been someone who has both a creative and a logical
        side. When I discovered web development in university, I realized it
        would be the perfect fit. I could use my creative side to design and my
        logical side to code. As a bonus, being both designer and developer
        allows me to make sure no detail is lost in translation.
      </p>
      <br />
      <MediaHandles />
      <br />
    </div>
  );
}
