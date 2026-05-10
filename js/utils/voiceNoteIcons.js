const SVG_NS = "http://www.w3.org/2000/svg";

export function setVoiceNoteControlIcon(button, iconName) {
  if (!button) {
    return;
  }

  const currentIconName = button.getAttribute("data-voice-note-icon");

  if (currentIconName === iconName) {
    return;
  }

  button.setAttribute("data-voice-note-icon", iconName);
  button.replaceChildren(createVoiceNoteControlIcon(iconName));
}

function createVoiceNoteControlIcon(iconName) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("voice-note-icon-svg");

  switch (iconName) {
    case "mic":
      appendPath(
        svg,
        "M12 14.25a3.25 3.25 0 0 0 3.25-3.25V7.25a3.25 3.25 0 1 0-6.5 0V11A3.25 3.25 0 0 0 12 14.25Z"
      );
      appendPath(
        svg,
        "M6.75 10.75a.75.75 0 0 1 .75.75 4.5 4.5 0 1 0 9 0 .75.75 0 0 1 1.5 0 6 6 0 0 1-5.25 5.96V20h2.25a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1 0-1.5h2.25v-2.54A6 6 0 0 1 6 11.5a.75.75 0 0 1 .75-.75Z"
      );
      break;
    case "pause":
      appendRect(svg, 7, 6, 3.5, 12);
      appendRect(svg, 13.5, 6, 3.5, 12);
      break;
    case "stop":
      appendRect(svg, 7, 7, 10, 10, 2);
      break;
    case "play":
    default:
      appendPath(svg, "M8.5 6.75v10.5c0 .59.64.96 1.15.66l8.1-5.25a.77.77 0 0 0 0-1.32l-8.1-5.25a.77.77 0 0 0-1.15.66Z");
      break;
  }

  return svg;
}

function appendPath(svg, d) {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "currentColor");
  svg.appendChild(path);
}

function appendRect(svg, x, y, width, height, rx = 1) {
  const rect = document.createElementNS(SVG_NS, "rect");
  rect.setAttribute("x", String(x));
  rect.setAttribute("y", String(y));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", String(rx));
  rect.setAttribute("fill", "currentColor");
  svg.appendChild(rect);
}
