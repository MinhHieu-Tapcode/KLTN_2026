import os
import xml.sax.saxutils as saxutils
import xml.etree.ElementTree as ET

def escape_xml(text):
    return saxutils.escape(text, {'"': '&quot;', "'": '&apos;'})

def create_sequence_xml(title, lifelines, messages, fragments, height=920, width=1150):
    xml = []
    xml.append(f'<mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="{width}" pageHeight="{height}" math="0" shadow="0">')
    xml.append('  <root>')
    xml.append('    <mxCell id="0" />')
    xml.append('    <mxCell id="1" parent="0" />')

    # Title label
    xml.append(f'    <mxCell id="title_node" value="{escape_xml(title)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Times New Roman;fontSize=16;fontStyle=1;" vertex="1" parent="1">')
    xml.append(f'      <mxGeometry x="300" y="10" width="550" height="30" as="geometry" />')
    xml.append('    </mxCell>')

    # Lifelines
    for ll_id, label, x, is_actor in lifelines:
        cx = x + 60
        if is_actor:
            xml.append(f'    <mxCell id="{ll_id}_actor" value="{escape_xml(label)}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#000000;fontFamily=Times New Roman;fontSize=12;fontStyle=1;" vertex="1" parent="1">')
            xml.append(f'      <mxGeometry x="{x+42}" y="50" width="35" height="60" as="geometry" />')
            xml.append('    </mxCell>')
            xml.append(f'    <mxCell id="{ll_id}_line" value="" style="edgeStyle=none;dashed=1;html=1;strokeColor=#000000;strokeWidth=1;endArrow=none;rounded=0;" edge="1" parent="1" source="{ll_id}_actor">')
            xml.append(f'      <mxGeometry relative="1" as="geometry"><mxPoint x="{cx}" y="{height-30}" as="targetPoint" /></mxGeometry>')
            xml.append('    </mxCell>')
        else:
            xml.append(f'    <mxCell id="{ll_id}" value="{escape_xml(label)}" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Times New Roman;fontSize=12;fontStyle=1;" vertex="1" parent="1">')
            xml.append(f'      <mxGeometry x="{x}" y="50" width="120" height="{height-90}" as="geometry" />')
            xml.append('    </mxCell>')

    # Frames (alt/opt/rect)
    for f_id, text, fx, fy, fw, fh in fragments:
        xml.append(f'    <mxCell id="{f_id}" value="{escape_xml(text)}" style="shape=umlFrame;whiteSpace=wrap;html=1;pointerEvents=0;recursiveResize=0;container=1;collapsible=0;width=85;fillColor=none;strokeColor=#000000;strokeWidth=1.2;fontFamily=Times New Roman;fontSize=11;fontStyle=1;align=left;spacingLeft=5;" vertex="1" parent="1">')
        xml.append(f'      <mxGeometry x="{fx}" y="{fy}" width="{fw}" height="{fh}" as="geometry" />')
        xml.append('    </mxCell>')

    # Messages
    for m_id, label, x1, x2, y, is_dashed, is_return in messages:
        arrow_style = "endArrow=open;endFill=0;dashed=1;" if is_return else ("endArrow=block;endFill=1;dashed=1;" if is_dashed else "endArrow=block;endFill=1;")
        align_pos = "0"
        offset_y = "-12"
        xml.append(f'    <mxCell id="{m_id}" value="{escape_xml(label)}" style="edgeStyle=none;html=1;{arrow_style}rounded=0;strokeColor=#000000;strokeWidth=1.2;fontFamily=Times New Roman;fontSize=11;labelBackgroundColor=#FFFFFF;" edge="1" parent="1">')
        xml.append(f'      <mxGeometry x="{align_pos}" y="{offset_y}" relative="1" as="geometry">')
        xml.append(f'        <mxPoint x="{x1}" y="{y}" as="sourcePoint" />')
        xml.append(f'        <mxPoint x="{x2}" y="{y}" as="targetPoint" />')
        xml.append(f'        <mxPoint as="offset" y="{offset_y}" />')
        xml.append('      </mxGeometry>')
        xml.append('    </mxCell>')

    xml.append('  </root>')
    xml.append('</mxGraphModel>')
    return '\n'.join(xml)

# 1. LOGIN SEQUENCE DIAGRAM
login_lifelines = [
    ('u', 'Người dùng', 30, True),
    ('ui', ':LoginView\n(Presentation)', 180, False),
    ('act', ':AuthAction\n(Server Action)', 370, False),
    ('lib', ':AuthLib\n(Security Lib)', 560, False),
    ('db', ':PrismaClient\n(PostgreSQL)', 750, False),
    ('app', ':SimpaceApp\n(Dashboard)', 940, False),
]

u_x, ui_x, act_x, lib_x, db_x, app_x = 90, 240, 430, 620, 810, 1000

login_fragments = [
    ('frag_alt1', 'alt\n[User không tồn tại / isActive == false]', 50, 280, 990, 100),
    ('frag_alt2', 'alt\n[Mật khẩu không khớp]', 50, 460, 990, 85),
]

login_messages = [
    ('m1', '1. Nhập identifier (email/mã), password & Bấm Đăng nhập', u_x, ui_x, 130, False, False),
    ('m2', '2. handleSubmit(e) [Thu thập FormData]', ui_x, ui_x + 50, 155, False, False),
    ('m2_ret', '', ui_x + 50, ui_x, 175, False, True),
    ('m3', '3. loginAction(formData)', ui_x, act_x, 205, False, False),
    ('m4', '4. prisma.user.findFirst({ email, username })', act_x, db_x, 235, False, False),
    ('m5', '5. Trả về thông tin User (passwordHash, role, isActive)', db_x, act_x, 260, True, True),
    
    # Alt 1: Thất bại user
    ('m6a', '6a. return { success: false, error: "Tài khoản không tồn tại hoặc bị khóa" }', act_x, ui_x, 315, True, True),
    ('m7a', '7a. setErrorMsg(error) -> Hiển thị cảnh báo lỗi màu đỏ trên form', ui_x, u_x, 345, True, True),
    
    # Nhánh hợp lệ tìm thấy user
    ('m6b', '6b. [else] verifyPassword(password, user.passwordHash)', act_x, lib_x, 400, False, False),
    ('m7b', '7b. Trả về kết quả isPasswordValid (true / false)', lib_x, act_x, 425, True, True),
    
    # Alt 2: Mật khẩu sai
    ('m8a', '8a. return { success: false, error: "Tài khoản hoặc mật khẩu không chính xác!" }', act_x, ui_x, 490, True, True),
    ('m9a', '9a. setErrorMsg(error) & focus lại ô nhập mật khẩu', ui_x, u_x, 520, True, True),
    
    # Thành công
    ('m8b', '8b. [else] prisma.user.update({ lastLoginAt: now() })', act_x, db_x, 570, False, False),
    ('m9b', '9b. createSessionToken(payload)', act_x, lib_x, 600, False, False),
    ('m10b', '10b. Trả về JWT Session token', lib_x, act_x, 625, True, True),
    ('m11b', '11b. setSessionCookie(token) [HttpOnly]', act_x, lib_x, 655, False, False),
    ('m12b', '12b. return { success: true, user, role: user.role.code }', act_x, ui_x, 685, True, True),
    ('m13b', '13b. onLoggedIn(user) [Điều hướng theo vai trò Role]', ui_x, app_x, 720, False, False),
    ('m14b', '14b. Hiển thị Dashboard tương ứng (Admin / Giảng viên / Học viên)', app_x, u_x, 750, True, True),
]

login_xml = create_sequence_xml('HÌNH: BIỂU ĐỒ TUẦN TỰ QUY TRÌNH ĐĂNG NHẬP (LOGIN)', login_lifelines, login_messages, login_fragments, height=820, width=1100)

with open('Bieu_Do_Tuan_Tu_Dang_Nhap.drawio', 'w', encoding='utf-8') as f:
    f.write(login_xml)

# Validate XML Login
ET.fromstring(login_xml)
print('Login XML is 100% valid.')

# 2. FORGOT PASSWORD SEQUENCE DIAGRAM
forgot_lifelines = [
    ('u', 'Người dùng', 30, True),
    ('ui', ':LoginView\n(Quên MK Dialog)', 180, False),
    ('act', ':AuthAction\n(Server Action)', 370, False),
    ('mail', ':MailService\n(Email OTP)', 560, False),
    ('lib', ':AuthLib\n(Security Lib)', 750, False),
    ('db', ':PrismaClient\n(PostgreSQL)', 940, False),
]

u_x, ui_x, act_x, mail_x, lib_x, db_x = 90, 240, 430, 620, 810, 1000

forgot_fragments = [
    ('rect_p1', 'GIAI ĐOẠN 1: YÊU CẦU CẤP MÃ OTP QUA EMAIL', 45, 110, 995, 340),
    ('frag_alt_email', 'alt\n[Email không tồn tại]', 55, 230, 975, 75),
    ('rect_p2', 'GIAI ĐOẠN 2: XÁC THỰC OTP & ĐẶT LẠI MẬT KHẨU', 45, 470, 995, 390),
    ('frag_alt_otp', 'alt\n[OTP không đúng / Hết hạn]', 55, 590, 975, 75),
]

forgot_messages = [
    # Giai đoạn 1
    ('m1', '1. Bấm "Quên mật khẩu?" & Nhập địa chỉ Email', u_x, ui_x, 140, False, False),
    ('m2', '2. requestPasswordResetOtpAction(email)', ui_x, act_x, 170, False, False),
    ('m3', '3. prisma.user.findUnique({ email })', act_x, db_x, 200, False, False),
    ('m4', '4. Trả về thông tin User', db_x, act_x, 220, True, True),
    
    ('m5a', '5a. return { success: false, error: "Không tìm thấy tài khoản với email này!" }', act_x, ui_x, 255, True, True),
    ('m6a', '6a. Hiển thị thông báo lỗi trên form', ui_x, u_x, 280, True, True),
    
    ('m5b', '5b. [else] Sinh OTP 6 số (hạn 15p) & Lưu vào bảng PasswordResetToken', act_x, db_x, 330, False, False),
    ('m6b', '6b. sendOtpEmail({ to: email, otp })', act_x, mail_x, 360, False, False),
    ('m7b', '7b. Trả về kết quả gửi email thành công', mail_x, act_x, 385, True, True),
    ('m8b', '8b. return { success: true }', act_x, ui_x, 410, True, True),
    ('m9b', '9b. Chuyển Form sang Bước 2: "Nhập mã OTP & Mật khẩu mới"', ui_x, u_x, 435, True, True),
    
    # Giai đoạn 2
    ('m10', '10. Nhập mã OTP (6 chữ số), Mật khẩu mới & bấm Xác nhận', u_x, ui_x, 500, False, False),
    ('m11', '11. resetPasswordWithOtpAction(email, otp, newPassword)', ui_x, act_x, 530, False, False),
    ('m12', '12. prisma.passwordResetToken.findFirst({ token: otp, usedAt: null, valid })', act_x, db_x, 560, False, False),
    ('m13', '13. Trả về bản ghi Token', db_x, act_x, 580, True, True),
    
    ('m14a', '14a. return { success: false, error: "Mã OTP không đúng hoặc đã hết hạn!" }', act_x, ui_x, 615, True, True),
    ('m15a', '15a. Báo lỗi và cho phép người dùng nhập lại mã', ui_x, u_x, 640, True, True),
    
    ('m14b', '14b. [else] hashPassword(newPassword)', act_x, lib_x, 690, False, False),
    ('m15b', '15b. Trả về newPasswordHash (Bcrypt)', lib_x, act_x, 715, True, True),
    ('m16b', '16b. prisma.user.update({ passwordHash: newHash })', act_x, db_x, 745, False, False),
    ('m17b', '17b. prisma.passwordResetToken.update({ usedAt: now() })', act_x, db_x, 775, False, False),
    ('m18b', '18b. return { success: true }', act_x, ui_x, 805, True, True),
    ('m19b', '19b. Thông báo "Đổi mật khẩu thành công!" -> Chuyển về Form Đăng nhập', ui_x, u_x, 835, True, True),
]

forgot_xml = create_sequence_xml('HÌNH: BIỂU ĐỒ TUẦN TỰ QUY TRÌNH QUÊN MẬT KHẨU & ĐẶT LẠI MẬT KHẨU', forgot_lifelines, forgot_messages, forgot_fragments, height=890, width=1100)

with open('Bieu_Do_Tuan_Tu_Quen_Mat_Khau.drawio', 'w', encoding='utf-8') as f:
    f.write(forgot_xml)

# Validate XML Forgot
ET.fromstring(forgot_xml)
print('Forgot Password XML is 100% valid.')
