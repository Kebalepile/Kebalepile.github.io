import  profilePic from "../assets/img/pp.png";

export default function Banner (){
    return (
        <section id="home" className="banner card">
            <img src={profilePic} alt="profile picture" loading="lazy" id="profile-pic"/>
        </section>
    )
}