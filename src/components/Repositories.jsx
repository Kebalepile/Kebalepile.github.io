import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { data } from "../utils/data";

export default function Repositories() {
  const [images, setImages] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);

  useEffect(() => {
    const fetchImages = async () => {
      const imagePromises = data.map(async (d) => {
        const img = await import(/* @vite-ignore */ d.imgSrc);
        return img.default;
      });

      const images = await Promise.all(imagePromises);
      setImages(images);
    };

    fetchImages();
  }, []);

  const RepoInfo = ({ data }) => {
    return (
      <div className="repo-info">
        <img src={images[data?.i]} loading="lazy" alt="repo icon" className="repo-info__img" />
        <div className="repo-info__content">
          <h2>{data?.name}</h2>
          <br/>
          <hr className="line" style={{width:"45%", borderRadius:"2px"}}/>
          <p>{data?.description}</p>
          <a href={data?.url} target="_blank" rel="noopener noreferrer">
            Open Web Application
          </a>
        </div>
      </div>
    );
  };
  
 
  RepoInfo.propTypes = {
    data: PropTypes.shape({
      name: PropTypes.string,
      description: PropTypes.string,
      url: PropTypes.string,
      i:PropTypes.number
    })
  };

  const toggleDialog = (repo) => {
    if (selectedRepo === repo) {
      setSelectedRepo(null);
    } else {
      setSelectedRepo(repo);
    }
  };

  return (
    <section id="repos">
      {data.map((d, i) => (
        <div className="repo" key={i}>
          <figure onClick={() => toggleDialog(d)}>
            <picture className="repo-image">
              <img
                src={images[i]}
                alt="repo icon"
                className="repo-image__img"
              />
            </picture>
            <figcaption>{d.name}</figcaption>
          </figure>
          {selectedRepo === d && (
            <dialog open className="dialog-overlay">
            <div className="dialog-content">
              <button className="dialog-close" onClick={() => toggleDialog(d)}>
                X
              </button>
              <RepoInfo data={{...d,i}} />
              <br/>
            </div>
          </dialog>
          )}
        </div>
      ))}
    </section>
  );
}
