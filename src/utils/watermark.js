/**
 * 生成base64图片
 * @param {Object} [param0={}]
 * @param {string} [param0.width="300px"]
 * @param {string} [param0.height="220px"]
 * @param {string} [param0.textAlign="center"]
 * @param {string} [param0.textBaseline="middle"]
 * @param {string} [param0.font="18px microsoft yahei"]
 * @param {string} [param0.fillStyle="rgba(184, 184, 184, 0.35)"]
 * @param {string} [param0.content]
 * @param {string} [param0.rotate="30"]
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
} = {}) {
  var canvas = document.createElement("canvas");
  canvas.setAttribute("width", width);
  canvas.setAttribute("height", height);
  var ctx = canvas.getContext("2d");

  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  ctx.font = font;
  ctx.fillStyle = fillStyle;
  ctx.translate(parseFloat(width) / 2, parseFloat(height) / 2);
  ctx.rotate((Math.PI / 180) * rotate);
  ctx.fillText(content, 0, 0);
  return canvas.toDataURL();
}

/**
 * 插入水印
 * @param {Object} [param0={}]
 * @param {HTMLElement} [param0.parentEl=document.body]
 * @param {string} [param0.id="watermark"]
 * @param {number} [param0.zIndex=1]
 * @param {Object} param0.option
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
 * @param {Object} param0
 * @param {HTMLElement} [param0.EL=document.body]
 * @param {Object} param0.option
 */
export function setWatermarkBg({ EL = document.body, option }) {
  EL.setAttribute(
    "style",
    `background-repeat:repeat;
    background-image:url('${generateWMBase64(option)}')`
  );
}
