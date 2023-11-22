// TODO: Get image bounds from JSON / Image directly
const w = 1920;
const h = 1080;
const ar = w / h;

//const ASSET_URL = 'https://assets.ego4d-data.org/videos';
const ASSET_URL = "assets/videos/";

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

function shuffle(max) {
  // https://stackoverflow.com/a/12646864
  // https://blog.codinghorror.com/the-danger-of-naivete/
  let arr = [...Array(max).keys()];
  for (let i = max - 1; i > 0; i--) {
    let n = getRandomInt(i + 1);
    [arr[i], arr[n]] = [arr[n], arr[i]];
  }
  return arr;
}

function camera_hover(tooltip, video, parallax) {
  if (!window || !window.innerWidth || !window.innerHeight) {
    return;
  }
  // Disable map hover if bbox falls outside.

  let pw = window.innerWidth,
    ph = window.innerHeight;
  let iw = w,
    ih = h;
  let iscale = 1;
  let mx, my, Mx, My, markers;
  let currentMarker = null;
  let currentScenario = "cooking";
  let currentTime = 0;

  video.oncanplay = () => {
    const video_ar = video.videoWidth / video.videoHeight;
    tooltip.style.width = `${video_ar * 360}px`;
    video.classList.add("fade-in");
    video.play();
  };

  const dom2img = (x, y) => {
    return [x + (iw - pw) / 2, y + (ih - ph) / 2].map((el) => el / iscale);
  };
  const img2dom = (x, y) => {
    const [sx, sy] = [x, y].map((el) => el * iscale);
    return [sx - (iw - pw) / 2, sy - (ih - ph) / 2];
  };

  // WARNING: Assuming BOUNDS is defined
  let dom_markers = Object.fromEntries(
    Object.entries(BOUNDS).map(([k, v]) => {
      const [x1, y1, x2, y2] = v;
      return [k, [...img2dom(x1, y1), ...img2dom(x2, y2)]];
    })
  );

  const find_intersection = (x, y) => {
    return Object.entries(markers).find(([marker, bbox]) => {
      const [x1, y1, x2, y2] = bbox;
      if (x < x1 || y < y1 || x >= x2 || y >= y2) {
        return false;
      }
      return true;
    });
  };
  const onmousemove = (e) => {
    const [x, y] = [e.clientX, e.clientY];
    if (x < mx || x > Mx || y < my || y > My) {
      tooltip.classList.add("gone");
      video.classList.remove("fade-in");
      video.pause();
      currentMarker = null;
      currentTime = video.currentTime;
      return;
    }
    const intersection = find_intersection(x, y);
    if (!intersection) {
      tooltip.classList.add("gone");
      video.classList.remove("fade-in");
      video.pause();
      currentMarker = null;
      currentTime = video.currentTime;
      return;
    }

    const [marker, bbox] = intersection;
    const [x1, y1, x2, y2] = bbox;

    if (currentMarker === marker) {
      // Already playing
      return;
    }
    currentMarker = marker;
    if (x1 > pw / 2) {
      tooltip.style.right = `${Math.max(0, pw - x1)}px`;
      tooltip.style.left = "auto";
    } else {
      tooltip.style.left = `${Math.min(x2, pw - 640)}px`;
      tooltip.style.right = "auto";
    }
    // TODO 360 is hardcoded, should depend on video
    const VW = 360;
    const top = (y1 + y2) / 2;

    tooltip.style.top = `${Math.round(
      Math.min(Math.max(8, ph * 0.6 - VW - 8), Math.max(8, top - VW / 2))
    )}px`;
    tooltip.style.bottom = `auto`;

    video.classList.remove("fade-in");
    video.pause();
    currentTime = video.currentTime;

    video.src = `${ASSET_URL}/${currentScenario}/${currentMarker}.mp4`;
    video.muted = false;
    video.currentTime = currentTime;
    video.load();

    tooltip.style.background = `white 50% 50%/contain no-repeat`;
    tooltip.classList.remove("gone");
  };
  let user_disabled = false;

  const calculateImageDims = () => {
    let par = pw / ph;
    if (par < ar) {
      ih = ph;
      iw = ph * ar;
      iscale = ph / h;
    } else {
      iw = pw;
      ih = pw / ar;
      iscale = pw / w;
    }
    dom_markers = Object.fromEntries(
      Object.entries(BOUNDS).map(([k, v]) => {
        const [x1, y1, x2, y2] = v;
        return [k, [...img2dom(x1, y1), ...img2dom(x2, y2)]];
      })
    );

    [mx, my, Mx, My] = dom_markers["bbox"];
    markers = { ...dom_markers };
    delete markers["bbox"];
    if (ph < 512 || pw < 1024) {
      parallax.onmousemove = null;
      parallax.onclick = (e) => {
        if (e.target !== parallax) {
          return;
        }
        user_disabled = !user_disabled;
        parallax.classList.toggle("paused");
      };
      return;
    }
    parallax.onmousemove = onmousemove;
    parallax.onclick = null;
    // if (mx < 0 || Mx >= pw || my < 0 || My >= ph) {
    //     parallax.onmousemove = onmousemove;
    // } else {
    //     parallax.onmousemove = onmousemove;
    // }
  };
  const resizeListener = () => {
    pw = window.innerWidth;
    ph = window.innerHeight;
    calculateImageDims();
  };

  let enabled = false;
  const disable = () => {
    if (!enabled) {
      return;
    }
    window.removeEventListener("resize", resizeListener, false);
    parallax.onmousemove = null;
    parallax.classList.add("paused");
    tooltip.classList.add("gone");
    video.classList.remove("fade-in");
    video.pause();
    video.src = "";
    video.load();
    currentMarker = null;
    enabled = false;
  };
  const enable = () => {
    if (enabled) {
      return;
    }
    if (!user_disabled) {
      parallax.classList.remove("paused");
    }
    window.addEventListener("resize", resizeListener, false);
    resizeListener();
    enabled = true;
  };

  return [enable, disable];
}
