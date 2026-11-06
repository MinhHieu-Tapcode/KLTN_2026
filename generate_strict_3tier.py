import xml.sax.saxutils as saxutils
import xml.etree.ElementTree as ET

def escape_xml(text):
    return saxutils.escape(text, {'"': '&quot;', "'": '&apos;'})

def generate_strict_3tier_xml(title, lifelines, messages, fragments, height=780, width=780):
    xml = []
    xml.append(f'<mxGraphModel dx="1000" dy="700" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">')
    xml.append('  <root>')
    xml.append('    <mxCell id="0" />')
    xml.append('    <mxCell id="1" parent="0" />')

    # Title label
    xml.append(f'    <mxCell id="title_node" value="{escape_xml(title)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Times New Roman;fontSize=15;fontStyle=1;" vertex="1" parent="1">')
    xml.append(f'      <mxGeometry x="120" y="15" width="560" height="25" as="geometry" />')
    xml.append('    </mxCell>')

    # Lifelines
    for ll_id, label, x, w, is_actor in lifelines:
        cx = x + (w // 2)
        if is_actor:
            xml.append(f'    <mxCell id="{ll_id}_actor" value="{escape_xml(label)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#000000;fontFamily=Times New Roman;fontSize=12;fontStyle=1;" vertex="1" parent="1">')
            xml.append(f'      <mxGeometry x="{cx - 16}" y="50" width="32" height="55" as="geometry" />')
            xml.append('    </mxCell>')
            xml.append(f'    <mxCell id="{ll_id}_line" value="" style="edgeStyle=none;dashed=1;html=1;strokeColor=#000000;strokeWidth=1;endArrow=none;rounded=0;" edge="1" parent="1" source="{ll_id}_actor">')
            xml.append(f'      <mxGeometry relative="1" as="geometry"><mxPoint x="{cx}" y="{height-20}" as="targetPoint" /></mxGeometry>')
            xml.append('    </mxCell>')
        else:
            xml.append(f'    <mxCell id="{ll_id}" value="{escape_xml(label)}" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Times New Roman;fontSize=12;fontStyle=1;" vertex="1" parent="1">')
            xml.append(f'      <mxGeometry x="{x}" y="50" width="{w}" height="{height-75}" as="geometry" />')
            xml.append('    </mxCell>')

    # Frames (alt/opt)
    for f_id, text, fx, fy, fw, fh in fragments:
        xml.append(f'    <mxCell id="{f_id}" value="{escape_xml(text)}" style="shape=umlFrame;whiteSpace=wrap;html=1;pointerEvents=0;recursiveResize=0;container=1;collapsible=0;width=85;fillColor=none;strokeColor=#000000;strokeWidth=1.2;fontFamily=Times New Roman;fontSize=11;fontStyle=1;align=left;spacingLeft=5;" vertex="1" parent="1">')
        xml.append(f'      <mxGeometry x="{fx}" y="{fy}" width="{fw}" height="{fh}" as="geometry" />')
        xml.append('    </mxCell>')

    # Messages
    for m_id, label, x1, x2, y, is_dashed, is_return in messages:
        arrow_style = "endArrow=open;endFill=0;dashed=1;" if is_return else ("endArrow=block;endFill=1;dashed=1;" if is_dashed else "endArrow=block;endFill=1;")
        offset_y = "-11"
        xml.append(f'    <mxCell id="{m_id}" value="{escape_xml(label)}" style="edgeStyle=none;html=1;{arrow_style}rounded=0;strokeColor=#000000;strokeWidth=1.2;fontFamily=Times New Roman;fontSize=11;labelBackgroundColor=#FFFFFF;" edge="1" parent="1">')
        xml.append(f'      <mxGeometry x="0" y="{offset_y}" relative="1" as="geometry">')
        xml.append(f'        <mxPoint x="{x1}" y="{y}" as="sourcePoint" />')
        xml.append(f'        <mxPoint x="{x2}" y="{y}" as="targetPoint" />')
        xml.append(f'        <mxPoint as="offset" y="{offset_y}" />')
        xml.append('      </mxGeometry>')
        xml.append('    </mxCell>')

    xml.append('  </root>')
    xml.append('</mxGraphModel>')
    return '\n'.join(xml)

# =========================================================================
# 1. BIỂU ĐỒ ĐĂNG NHẬP: ĐÚNG 3 LỚP HỆ THỐNG (Khổ rộng: 740px vừa in A4)
# =========================================================================
# Lifelines:
# Actor: Người dùng (x=40, cx=65)
# Tầng 1: :LoginView (Presentation) (x=170, w=130, cx=235)
# Tầng 2: :AuthController (Business Logic & Session) (x=380, w=150, cx=455)
# Tầng 3: :Database (PostgreSQL / Prisma) (x=600, w=130, cx=665)
login_ll = [
    ('u', 'Người dùng', 35, 60, True),
    ('ui', ':LoginView\n(Presentation Layer)', 170, 130, False),
    ('ctrl', ':AuthController\n(Business Logic Layer)', 380, 150, False),
    ('db', ':Database\n(Data Layer)', 600, 130, False),
]

u_x, ui_x, ctrl_x, db_x = 65, 235, 455, 665

login_frags = [
    ('alt1', 'alt\n[Tài khoản không tồn tại / Bị khóa]', 45, 275, 660, 95),
    ('alt2', 'alt\n[Mật khẩu không khớp]', 45, 440, 660, 85),
]

login_msgs = [
    ('m1', '1. Nhập identifier, password & Bấm Đăng nhập', u_x, ui_x, 125, False, False),
    ('m2', '2. handleSubmit(e) [Thu thập dữ liệu form]', ui_x, ui_x + 45, 150, False, False),
    ('m2_ret', '', ui_x + 45, ui_x, 170, False, True),
    ('m3', '3. login(identifier, password)', ui_x, ctrl_x, 200, False, False),
    ('m4', '4. findUser(identifier)', ctrl_x, db_x, 230, False, False),
    ('m5', '5. Trả về thông tin User (passwordHash, role, isActive)', db_x, ctrl_x, 255, True, True),
    
    # Alt 1: Thất bại User
    ('m6a', '6a. return { success: false, error: "Tài khoản không tồn tại hoặc bị khóa" }', ctrl_x, ui_x, 310, True, True),
    ('m7a', '7a. Hiển thị thông báo lỗi màu đỏ trên form', ui_x, u_x, 340, True, True),
    
    # Nhánh hợp lệ -> Kiểm tra pass
    ('m6b', '6b. [else] verifyPassword(password, hash) [Bcrypt]', ctrl_x, ctrl_x + 50, 390, False, False),
    ('m6b_ret', '', ctrl_x + 50, ctrl_x, 410, False, True),
    
    # Alt 2: Thất bại Pass
    ('m8a', '8a. return { success: false, error: "Sai mật khẩu!" }', ctrl_x, ui_x, 470, True, True),
    ('m9a', '9a. Báo sai mật khẩu & focus lại ô nhập', ui_x, u_x, 500, True, True),
    
    # Thành công
    ('m8b', '8b. [else] updateLastLogin(userId)', ctrl_x, db_x, 550, False, False),
    ('m9b', '9b. createSessionToken() & setSessionCookie()', ctrl_x, ctrl_x + 50, 580, False, False),
    ('m9b_ret', '', ctrl_x + 50, ctrl_x, 600, False, True),
    ('m10b', '10b. return { success: true, role }', ctrl_x, ui_x, 630, True, True),
    ('m11b', '11b. Điều hướng hiển thị Dashboard theo vai trò (Role)', ui_x, u_x, 665, True, True),
]

login_xml = generate_strict_3tier_xml('HÌNH: BIỂU ĐỒ TUẦN TỰ QUY TRÌNH ĐĂNG NHẬP (CHUẨN 3 LỚP)', login_ll, login_msgs, login_frags, height=730, width=780)

with open('Bieu_Do_Tuan_Tu_Dang_Nhap.drawio', 'w', encoding='utf-8') as f:
    f.write(login_xml)

ET.fromstring(login_xml)
print("Login 3-tier XML valid.")

# =========================================================================
# 2. BIỂU ĐỒ QUÊN MẬT KHẨU: ĐÚNG 3 LỚP HỆ THỐNG (+ Mail Service là dịch vụ ngoài)
# =========================================================================
# Lifelines:
# Actor: Người dùng (x=30, cx=55)
# Tầng 1: :LoginView (x=150, w=120, cx=210)
# Tầng 2: :AuthController (x=330, w=140, cx=400)
# Tầng 3: :Database (x=530, w=120, cx=590)
# External: :MailService (x=680, w=90, cx=725)
forgot_ll = [
    ('u', 'Người dùng', 25, 60, True),
    ('ui', ':LoginView\n(Presentation)', 150, 120, False),
    ('ctrl', ':AuthController\n(Business Logic)', 330, 140, False),
    ('db', ':Database\n(Data Layer)', 530, 120, False),
    ('mail', ':MailService\n(External)', 680, 95, False),
]

u_x, ui_x, ctrl_x, db_x, mail_x = 55, 210, 400, 590, 725

forgot_frags = [
    ('p1', 'GIAI ĐOẠN 1: YÊU CẦU CẤP MÃ OTP QUA EMAIL', 35, 110, 735, 290),
    ('alt_email', 'alt\n[Email không tồn tại]', 45, 215, 715, 65),
    ('p2', 'GIAI ĐOẠN 2: XÁC THỰC OTP & ĐẶT LẠI MẬT KHẨU MỚI', 35, 415, 735, 345),
    ('alt_otp', 'alt\n[OTP không đúng / Hết hạn]', 45, 520, 715, 65),
]

forgot_msgs = [
    # Giai đoạn 1
    ('f1', '1. Bấm "Quên MK?" & Nhập Email', u_x, ui_x, 135, False, False),
    ('f2', '2. requestResetOtp(email)', ui_x, ctrl_x, 160, False, False),
    ('f3', '3. findUserByEmail(email)', ctrl_x, db_x, 185, False, False),
    ('f4', '4. Trả về thông tin User', db_x, ctrl_x, 205, True, True),
    
    ('f5a', '5a. return { success: false, error: "Email không tồn tại!" }', ctrl_x, ui_x, 235, True, True),
    ('f6a', '6a. Báo lỗi email trên form', ui_x, u_x, 255, True, True),
    
    ('f5b', '5b. [else] Lưu OTP 6 số vào bảng PasswordResetToken (hạn 15p)', ctrl_x, db_x, 295, False, False),
    ('f6b', '6b. sendOtpEmail(to: email, otp)', ctrl_x, mail_x, 320, False, False),
    ('f7b', '7b. Gửi email thành công', mail_x, ctrl_x, 345, True, True),
    ('f8b', '8b. return { success: true } -> Chuyển sang Bước 2 (Nhập OTP & MK mới)', ctrl_x, ui_x, 370, True, True),
    
    # Giai đoạn 2
    ('f9', '9. Nhập OTP (6 số), Mật khẩu mới & bấm Xác nhận', u_x, ui_x, 440, False, False),
    ('f10', '10. resetPassword(email, otp, newPassword)', ui_x, ctrl_x, 465, False, False),
    ('f11', '11. verifyOtp(email, otp)', ctrl_x, db_x, 490, False, False),
    ('f12', '12. Trả về Token hợp lệ (chưa dùng & còn hạn)', db_x, ctrl_x, 510, True, True),
    
    ('f13a', '13a. return { success: false, error: "OTP sai hoặc hết hạn!" }', ctrl_x, ui_x, 540, True, True),
    ('f14a', '14a. Hiển thị thông báo lỗi cho người dùng', ui_x, u_x, 560, True, True),
    
    ('f13b', '13b. [else] hashPassword(newPassword) [Bcrypt]', ctrl_x, ctrl_x + 45, 600, False, False),
    ('f13b_ret', '', ctrl_x + 45, ctrl_x, 620, False, True),
    ('f14b', '14b. updateUserPassword(newHash) & markOtpUsed()', ctrl_x, db_x, 645, False, False),
    ('f15b', '15b. return { success: true }', ctrl_x, ui_x, 675, True, True),
    ('f16b', '16b. Thông báo đổi mật khẩu thành công & Quay lại Form Đăng nhập', ui_x, u_x, 705, True, True),
]

forgot_xml = generate_strict_3tier_xml('HÌNH: BIỂU ĐỒ TUẦN TỰ QUY TRÌNH QUÊN MẬT KHẨU (CHUẨN 3 LỚP)', forgot_ll, forgot_msgs, forgot_frags, height=780, width=790)

with open('Bieu_Do_Tuan_Tu_Quen_Mat_Khau.drawio', 'w', encoding='utf-8') as f:
    f.write(forgot_xml)

ET.fromstring(forgot_xml)
print("Forgot 3-tier XML valid.")
