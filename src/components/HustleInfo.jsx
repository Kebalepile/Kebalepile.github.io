import heartSvg from "../assets/img/heart.svg";
export default function HustleInfo() {
  return (
    <div className="card">
      <h2 className="header">I <img  id="heartBalloon" src={heartSvg} alt="heart emoji"/> working with small businesses</h2>
      <br />
      <p className="details">
        I specialize in creating sites for individuals and small businesses. You
        shouldn’t have to settle for cheap solutions or generic templates.{" "}
        <br />I provide custom designs at affordable prices, your website is the
        first impression your customers will get, so make sure it’s a good one.
        Take a look at my portfolio below, if you think I’d be a good match send
        me an email.
      </p>
    </div>
  );
}
