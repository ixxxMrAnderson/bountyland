from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
OUT = ROOT

BG = "#F7F8FB"
TEXT = "#1E293B"
LINE = "#475569"
ACCENT = "#0F766E"
ACCENT_LIGHT = "#E6FFFB"
BOX = "#FFFFFF"
RED = "#DC2626"


def load_font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size, index=0)
        except Exception:
            continue
    return ImageFont.load_default()


FONT_TITLE = load_font(40, bold=True)
FONT_H1 = load_font(28, bold=True)
FONT_H2 = load_font(24)
FONT_SM = load_font(20)


def canvas(width=1800, height=1100):
    image = Image.new("RGB", (width, height), BG)
    return image, ImageDraw.Draw(image)


def centered_text(draw, box, text, font=FONT_H2, fill=TEXT):
    x1, y1, x2, y2 = box
    lines = text.split("\n")
    line_heights = []
    line_widths = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_widths.append(bbox[2] - bbox[0])
        line_heights.append(bbox[3] - bbox[1])
    total_height = sum(line_heights) + max(0, len(lines) - 1) * 8
    y = y1 + (y2 - y1 - total_height) / 2
    for line, w, h in zip(lines, line_widths, line_heights):
        x = x1 + (x2 - x1 - w) / 2
        draw.text((x, y), line, font=font, fill=fill)
        y += h + 8


def rounded_box(draw, box, outline=ACCENT, fill=BOX, radius=28, width=4, text="", font=FONT_H2):
    draw.rounded_rectangle(box, radius=radius, outline=outline, fill=fill, width=width)
    if text:
        centered_text(draw, box, text, font=font)


def rect_box(draw, box, outline=ACCENT, fill=BOX, width=4, text="", font=FONT_H2):
    draw.rectangle(box, outline=outline, fill=fill, width=width)
    if text:
        centered_text(draw, box, text, font=font)


def diamond(draw, center, w, h, outline=RED, fill=BOX, width=4, text="", font=FONT_H2):
    cx, cy = center
    pts = [(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)]
    draw.polygon(pts, outline=outline, fill=fill, width=width)
    if text:
        centered_text(draw, (cx - w // 2 + 20, cy - h // 2 + 10, cx + w // 2 - 20, cy + h // 2 - 10), text, font=font)


def arrow(draw, start, end, fill=LINE, width=5, head=18):
    x1, y1 = start
    x2, y2 = end
    draw.line((x1, y1, x2, y2), fill=fill, width=width)
    if abs(x2 - x1) >= abs(y2 - y1):
        if x2 >= x1:
            pts = [(x2, y2), (x2 - head, y2 - head // 2), (x2 - head, y2 + head // 2)]
        else:
            pts = [(x2, y2), (x2 + head, y2 - head // 2), (x2 + head, y2 + head // 2)]
    else:
        if y2 >= y1:
            pts = [(x2, y2), (x2 - head // 2, y2 - head), (x2 + head // 2, y2 - head)]
        else:
            pts = [(x2, y2), (x2 - head // 2, y2 + head), (x2 + head // 2, y2 + head)]
    draw.polygon(pts, fill=fill)


def title(draw, text):
    draw.text((60, 36), text, font=FONT_TITLE, fill=TEXT)


def save(image, name):
    image.save(OUT / name, format="PNG")


def img01():
    image, draw = canvas(1800, 900)
    title(draw, "Agent 整体架构图")
    rounded_box(draw, (80, 340, 300, 450), outline=RED, text="用户")
    rounded_box(draw, (420, 320, 860, 470), text="任务受理与拆解 Agent", font=FONT_H1)
    diamond(draw, (1080, 395), 280, 170, text="任务类型路由")
    rounded_box(draw, (1320, 210, 1680, 350), text="数据集 Miner", font=FONT_H1)
    rounded_box(draw, (1320, 460, 1680, 600), text="代码 Debug Miner", font=FONT_H1)
    rounded_box(draw, (1320, 670, 1680, 810), outline=RED, text="产物 / 结果", font=FONT_H1)
    arrow(draw, (300, 395), (420, 395))
    arrow(draw, (860, 395), (940, 395))
    arrow(draw, (1220, 350), (1320, 280))
    arrow(draw, (1220, 440), (1320, 530))
    arrow(draw, (1500, 350), (1500, 670))
    arrow(draw, (1500, 600), (1500, 670))
    save(image, "01-overall-architecture.png")


def img02():
    image, draw = canvas(1800, 1300)
    title(draw, "任务受理与拆解 Agent 流程图")
    rounded_box(draw, (720, 120, 1080, 230), outline=RED, text="用户输入任务", font=FONT_H1)
    rounded_box(draw, (720, 300, 1080, 410), text="可行性检查", font=FONT_H1)
    diamond(draw, (900, 535), 320, 180, text="是否在支持范围内", font=FONT_H1)
    rect_box(draw, (180, 470, 520, 600), outline=RED, text="拒绝并说明原因", font=FONT_H1)
    rounded_box(draw, (720, 650, 1080, 760), text="缺失信息检测", font=FONT_H1)
    diamond(draw, (900, 885), 300, 180, text="信息是否足够", font=FONT_H1)
    rect_box(draw, (180, 820, 560, 950), text="追问用户补充信息", font=FONT_H1)
    rounded_box(draw, (720, 1000, 1080, 1110), text="任务拆解", font=FONT_H1)
    rounded_box(draw, (1180, 1000, 1540, 1110), text="任务标准化", font=FONT_H1)
    rounded_box(draw, (1180, 1160, 1540, 1270), outline=RED, text="输出最终 TaskSpec", font=FONT_H1)
    rounded_box(draw, (720, 1160, 1080, 1270), text="任务路由", font=FONT_H1)
    arrow(draw, (900, 230), (900, 300))
    arrow(draw, (900, 410), (900, 445))
    arrow(draw, (740, 535), (520, 535))
    arrow(draw, (900, 625), (900, 650))
    arrow(draw, (900, 760), (900, 795))
    arrow(draw, (750, 885), (560, 885))
    arrow(draw, (370, 820), (370, 650))
    arrow(draw, (900, 975), (900, 1000))
    arrow(draw, (1080, 1055), (1180, 1055))
    arrow(draw, (900, 1110), (900, 1160))
    arrow(draw, (1080, 1215), (1180, 1215))
    save(image, "02-task-intake-agent.png")


def img03():
    image, draw = canvas(1800, 1000)
    title(draw, "数据集 Miner 流程图")
    boxes = [
        ((120, 380, 360, 500), "TaskSpec"),
        ((430, 360, 700, 520), "数据集规划器"),
        ((780, 360, 1050, 520), "来源发现器"),
        ((1130, 330, 1430, 550), "抽取 / 收集器"),
        ((1130, 610, 1430, 830), "清洗 / 结构化器"),
        ((1510, 470, 1740, 610), "打包器"),
    ]
    for box, text in boxes:
        rounded_box(draw, box, text=text, font=FONT_H1 if len(text) < 10 else FONT_H2)
    rounded_box(draw, (1510, 720, 1740, 860), outline=RED, text="数据集结果包", font=FONT_H1)
    arrow(draw, (360, 440), (430, 440))
    arrow(draw, (700, 440), (780, 440))
    arrow(draw, (1050, 440), (1130, 440))
    arrow(draw, (1280, 550), (1280, 610))
    arrow(draw, (1430, 720), (1510, 790))
    arrow(draw, (1430, 520), (1510, 540))
    save(image, "03-dataset-miner.png")


def img04():
    image, draw = canvas(1900, 1000)
    title(draw, "代码 Debug Miner 流程图")
    boxes = [
        ((60, 380, 360, 520), "TaskSpec +\n仓库上下文"),
        ((430, 360, 700, 520), "问题解释器"),
        ((780, 360, 1050, 520), "代码检查器"),
        ((1130, 360, 1400, 520), "根因分析器"),
        ((1480, 330, 1780, 550), "修复规划器"),
        ((1480, 610, 1780, 830), "验证器"),
    ]
    for box, text in boxes:
        rounded_box(draw, box, text=text, font=FONT_H1)
    rounded_box(draw, (1480, 840, 1780, 950), outline=RED, text="Debug 结果包", font=FONT_H1)
    arrow(draw, (360, 450), (430, 450))
    arrow(draw, (700, 450), (780, 450))
    arrow(draw, (1050, 450), (1130, 450))
    arrow(draw, (1400, 450), (1480, 450))
    arrow(draw, (1630, 550), (1630, 610))
    arrow(draw, (1630, 830), (1630, 840))
    save(image, "04-debug-miner.png")


def img05():
    image, draw = canvas(1900, 950)
    title(draw, "技术架构图")
    rounded_box(draw, (80, 260, 320, 380), outline=RED, text="前端", font=FONT_H1)
    rounded_box(draw, (80, 500, 320, 620), outline=RED, text="Go Backend", font=FONT_H1)
    rounded_box(draw, (500, 380, 900, 510), text="Agent Backend", font=FONT_H1)
    rounded_box(draw, (1030, 360, 1430, 530), text="LangGraph\nWorkflows", font=FONT_H1)
    rounded_box(draw, (1540, 180, 1820, 300), text="任务受理 Agent", font=FONT_H2)
    rounded_box(draw, (1540, 390, 1820, 510), text="数据集 Miner Graph", font=FONT_H2)
    rounded_box(draw, (1540, 600, 1820, 720), text="Debug Miner Graph", font=FONT_H2)
    arrow(draw, (320, 320), (500, 430))
    arrow(draw, (320, 560), (500, 460))
    arrow(draw, (900, 445), (1030, 445))
    arrow(draw, (1430, 400), (1540, 240))
    arrow(draw, (1430, 445), (1540, 450))
    arrow(draw, (1430, 490), (1540, 660))
    save(image, "05-technical-architecture.png")


def img06():
    image, draw = canvas(1900, 1100)
    title(draw, "TaskSpec 统一协议图")
    rounded_box(draw, (780, 100, 1120, 210), outline=RED, text="TaskSpec", font=FONT_H1)
    rect_box(draw, (120, 340, 560, 540), text="task_info\n\n- task_id\n- title\n- task_type", font=FONT_H2)
    rect_box(draw, (670, 340, 1230, 540), text="feasibility\n\n- accepted\n- reason", font=FONT_H2)
    rect_box(draw, (1280, 300, 1760, 620), text="user_requirements\n\n- goal\n- detailed_requirements\n- constraints\n- output_format", font=FONT_H2)
    rect_box(draw, (220, 680, 760, 980), text="execution_context\n\n- target_schema\n- target_size\n- source_scope\n- repo_path?", font=FONT_H2)
    rect_box(draw, (1080, 720, 1560, 920), outline=RED, text="routing\n\n- assigned_agent", font=FONT_H2)
    arrow(draw, (860, 210), (400, 340))
    arrow(draw, (900, 210), (950, 340))
    arrow(draw, (1040, 210), (1520, 300))
    arrow(draw, (860, 210), (490, 680))
    arrow(draw, (1040, 210), (1320, 720))
    save(image, "06-taskspec-structure.png")


def img07():
    image, draw = canvas(1900, 850)
    title(draw, "架构演进路径图")
    rounded_box(draw, (80, 300, 420, 470), text="当前阶段\n一个 Intake Agent", font=FONT_H1)
    rounded_box(draw, (520, 280, 920, 490), text="两个专用 Miner\nDataset / Debug", font=FONT_H1)
    rounded_box(draw, (1040, 280, 1460, 490), text="每个 Miner 内部\n做成多步骤 Graph", font=FONT_H1)
    rounded_box(draw, (1560, 260, 1840, 510), outline=RED, text="后续如果需要\n再拆成更细粒度\n子 Agent", font=FONT_H1)
    arrow(draw, (420, 385), (520, 385))
    arrow(draw, (920, 385), (1040, 385))
    arrow(draw, (1460, 385), (1560, 385))
    save(image, "07-evolution-path.png")


def main():
    img01()
    img02()
    img03()
    img04()
    img05()
    img06()
    img07()


if __name__ == "__main__":
    main()
