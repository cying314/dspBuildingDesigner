/**
 * @typedef {Object} wmOptions
 * @property {string} width
 * @property {string} height
 * @property {string} textAlign
 * @property {string} textBaseline
 * @property {string} font
 * @property {string} fillStyle
 * @property {string} content
 * @property {string} rotate
 */
/**
 * 生成base64图片
 * @param {wmOptions} options
 */
export function generateWMBase64({
  width = "300px",
  height = "200px",
  textAlign = "center",
  textBaseline = "middle",
  font = "18px microsoft yahei",
  fillStyle = "rgba(184, 184, 184, 0.35)",
  content = "水印",
  rotate = "30",
  lineHeight = 35,
} = {}) {
  var canvas = document.createElement("canvas");
  canvas.setAttribute("width", width);
  canvas.setAttribute("height", height);
  var ctx = canvas.getContext("2d");

  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  ctx.font = font;
  ctx.fillStyle = fillStyle;
  var row = content.split("\n");
  ctx.translate(parseFloat(width) / 2, parseFloat(height) / 2 - (row.length * lineHeight) / 2);
  ctx.rotate((Math.PI / 180) * rotate);
  // ctx.fillText(content, 0, 0);
  for (var i = 0; i < row.length; i++) {
    ctx.fillText(row[i], 0, (i + 1) * lineHeight);
  }
  return canvas.toDataURL();
}

/**
 * 插入水印
 * @param {Object} options
 * @param {HTMLElement} options.parentEl
 * @param {string} options.id
 * @param {number} options.zIndex
 * @param {wmOptions} options.option
 */
export function insertWatermark({
  parentEl = document.body,
  id = "watermark",
  zIndex = 1,
  option,
} = {}) {
  const watermarkDiv = document.createElement("div");
  watermarkDiv.id = id;
  watermarkDiv.setAttribute(
    "style",
    `position:fixed;
    top:0;
    left:0;
    right:0;
    bottom:0;
    z-index:${zIndex};
    pointer-events:none;
    background-repeat:repeat;
    background-image:url('${generateWMBase64(option)}')`
  );

  parentEl.style.position = "relative";
  parentEl.insertBefore(watermarkDiv, parentEl.firstChild);
}

/**
 * 设置水印背景
 * @param {Object} options
 * @param {HTMLElement} options.EL
 * @param {wmOptions} options.option
 */
export function setWatermarkBg({ EL = document.body, option }) {
  EL.setAttribute(
    "style",
    `background-repeat:repeat;
    background-image:url('${generateWMBase64(option)}')`
  );
}
