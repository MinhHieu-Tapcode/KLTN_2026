import xml.sax.saxutils as saxutils
import xml.etree.ElementTree as ET

def escape_xml(text):
    return saxutils.escape(text, {'"': '&quot;', "'": '&apos;'})

def generate_exact_template_xml(title, lifelines, messages, notes, fragments, height=840):
    xml = []
    xml.append('<mxGraphModel dx="1000" dy="700" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169" math="0" shadow="0">')
    xml.append('  <root>')
    xml.append('    <mxCell id="0" />')
    xml.append('    <mxCell id="1" parent="0" />')

    # Title label
    xml.append(f'    <mxCell id="title_node" value="{escape_xml(title)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontFamily=Times New Roman;fontSize=15;fontStyle=1;" vertex="1" parent="1">')
    xml.append(f'      <mxGeometry x="120" y="15" width="560" height="25" as="geometry" />')
    xml.append('    </mxCell>')

    # Lifelines
    for ll_id, title_line1, title_line2, x, w, is_actor in lifelines:
        cx = x + (w // 2)
        if is_actor:
            xml.append(f'    <mxCell id="{ll_id}_actor" value="{escape_xml(title_line1)}" style="shape=umlActor;verticalLabelPosition=top;verticalAlign=bottom;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#000000;fontFamily=Times New Roman;fontSize=12;fontStyle=1;" vertex="1" parent="1">')
            xml.append(f'      <mxGeometry x="{cx - 16}" y="65" width="32" height="55" as="geometry" />')
            xml.append('    </mxCell>')
            xml.append(f'    <mxCell id="{ll_id}_line" value="" style="edgeStyle=none;dashed=1;html=1;strokeColor=#000000;strokeWidth=1;endArrow=none;rounded=0;" edge="1" parent="1" source="{ll_id}_actor">')
            xml.append(f'      <mxGeometry relative="1" as="geometry"><mxPoint x="{cx}" y="{height-25}" as="targetPoint" /></mxGeometry>')
            xml.append('    </mxCell>')
        else:
            raw_html = f'<b>{title_line1}</b><br><font style="font-size: 11px;">{title_line2}</font>'
            val = escape_xml(raw_html)
            xml.append(f'    <mxCell id="{ll_id}" value="{val}" style="shape=umlLifeline;perimeter=lifelinePerimeter;whiteSpace=wrap;html=1;container=1;dropTarget=0;collapsible=0;recursiveResize=0;outlineConnect=0;portConstraint=eastwest;fillColor=#FFFFFF;strokeColor=#000000;strokeWidth=1.5;fontFamily=Times New Roman;fontSize=12;" vertex="1" parent="1">')
            xml.append(f'      <mxGeometry x="{x}" y="65" width="{w}" height="{height-90}" as="geometry" />')
            xml.append('    </mxCell>')

    # Fragments (alt)
    for f_id, text, fx, fy, fw, fh in fragments:
        xml.append(f'    <mxCell id="{f_id}" value="{escape_xml(text)}" style="shape=umlFrame;whiteSpace=wrap;html=1;pointerEvents=0;recursiveResize=0;container=1;collapsible=0;width=85;fillColor=none;strokeColor=#000000;strokeWidth=1.2;fontFamily=Times New Roman;fontSize=11;fontStyle=1;align=left;spacingLeft=5;" vertex="1" parent="1">')
        xml.append(f'      <mxGeometry x="{fx}" y="{fy}" width="{fw}" height="{fh}" as="geometry" />')
        xml.append('    </mxCell>')

    # Notes (folded corner)
    for n_id, n_text, nx, ny, nw, nh in notes:
        xml.append(f'    <mxCell id="{n_id}" value="{escape_xml(n_text)}" style="shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#FFFFFF;strokeColor=#000000;fontFamily=Times New Roman;fontSize=10;align=left;spacing=4;" vertex="1" parent="1">')
        xml.append(f'      <mxGeometry x="{nx}" y="{ny}" width="{nw}" height="{nh}" as="geometry" />')
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
# 1. LOGIN SEQUENCE: Đúng 4 cột hệ thống + 1 Actor y hệt hình mẫu tạo bài tập
# =========================================================================
login_lifelines = [
    ('u', ': Người dùng', '', 25, 60, True),
    ('ui', ':LoginView', '(Giao diện UI)', 130, 130, False),
    ('act', ':loginAction', '(Server Action)', 300, 135, False),
    ('svc', ':authService', '(Service Tầng nghiệp vụ)', 470, 140, False),
    ('db', ':Database', '(PostgreSQL / Prisma)', 645, 130, False),
]

u_x, ui_x, act_x, svc_x, db_x = 55, 195, 367, 540, 710

login_notes = [
    ('n_val', '3. checkAuth(session) &\nValidate dữ liệu (identifier, pass)', 375, 185, 140, 35)
]

login_frags = [
    ('alt1', 'alt\n[Tài khoản không tồn tại / Bị khóa]', 40, 310, 685, 80),
    ('alt2', 'alt\n[Mật khẩu không khớp]', 40, 465, 685, 75),
]

login_messages = [
    ('m1', '1. Nhập thông tin & bấm "Đăng nhập"', u_x, ui_x, 140, False, False),
    ('m2', '2. Gửi dữ liệu đăng nhập (formData)', ui_x, act_x, 170, False, False),
    
    ('m3', '4. authenticateUser(identifier, password)', act_x, svc_x, 235, False, False),
    ('m4', '5. findUser(identifier)', svc_x, db_x, 260, False, False),
    ('m5', '6. Trả về thông tin User', db_x, svc_x, 285, True, True),
    
    # Alt 1: Thất bại User
    ('m6a', '7a. return { success: false, error: "Tài khoản không tồn tại hoặc bị khóa" }', svc_x, act_x, 335, True, True),
    ('m7a', '8a. return { success: false, error }', act_x, ui_x, 355, True, True),
    ('m8a', '9a. Hiển thị thông báo lỗi trên giao diện', ui_x, u_x, 375, True, True),
    
    # Nhánh kiểm tra mật khẩu
    ('m6b', '7b. [else] verifyPassword(password, hash) [Bcrypt]', svc_x, svc_x + 40, 415, False, False),
    ('m6b_ret', '', svc_x + 40, svc_x, 435, False, True),
    
    # Alt 2: Mật khẩu sai
    ('m9a', '8a. return { success: false, error: "Sai mật khẩu!" }', svc_x, act_x, 490, True, True),
    ('m10a', '9a. return { success: false, error }', act_x, ui_x, 510, True, True),
    ('m11a', '10a. Báo sai mật khẩu & focus lại ô nhập', ui_x, u_x, 530, True, True),
    
    # Thành công
    ('m9b', '8b. [else] updateLastLogin(userId)', svc_x, db_x, 570, False, False),
    ('m10b', '9b. return { user, role }', svc_x, act_x, 600, True, True),
    ('m11b', '10b. setSessionCookie(token) [HttpOnly]', act_x, act_x + 40, 630, False, False),
    ('m11b_ret', '', act_x + 40, act_x, 650, False, True),
    ('m12b', '11b. return { success: true, role }', act_x, ui_x, 680, True, True),
    ('m13b', '12b. Điều hướng hiển thị Dashboard theo vai trò', ui_x, u_x, 715, True, True),
]

login_xml = generate_exact_template_xml('HÌNH: BIỂU ĐỒ TUẦN TỰ QUY TRÌNH ĐĂNG NHẬP', login_lifelines, login_messages, login_notes, login_frags, height=760)

with open('Bieu_Do_Tuan_Tu_Dang_Nhap.drawio', 'w', encoding='utf-8') as f:
    f.write(login_xml)

ET.fromstring(login_xml)
print("Login template XML valid.")

# =========================================================================
# 2. FORGOT PASSWORD SEQUENCE: Chuẩn 4 cột hệ thống + MailService ngoài
# =========================================================================
forgot_lifelines = [
    ('u', ': Người dùng', '', 20, 60, True),
    ('ui', ':LoginView', '(Giao diện UI)', 110, 125, False),
    ('act', ':forgotPasswordAction', '(Server Action)', 260, 135, False),
    ('svc', ':authService', '(Service Tầng nghiệp vụ)', 420, 140, False),
    ('db', ':Database', '(PostgreSQL / Prisma)', 585, 115, False),
    ('mail', ':MailService', '(External Service)', 715, 95, False),
]

u_x, ui_x, act_x, svc_x, db_x, mail_x = 50, 172, 327, 490, 642, 762

forgot_notes = [
    ('n_otp', 'Validate Email hợp lệ', 335, 160, 120, 30),
    ('n_pwd', 'Validate OTP (6 số) &\nĐộ dài mật khẩu (>=6)', 335, 455, 125, 35),
]

forgot_frags = [
    ('p1', 'GIAI ĐOẠN 1: YÊU CẦU CẤP MÃ OTP QUA EMAIL', 35, 110, 755, 290),
    ('alt_email', 'alt\n[Email không tồn tại]', 45, 215, 735, 65),
    ('p2', 'GIAI ĐOẠN 2: XÁC THỰC OTP & ĐẶT LẠI MẬT KHẨU MỚI', 35, 410, 755, 350),
    ('alt_otp', 'alt\n[OTP sai / Hết hạn]', 45, 520, 735, 65),
]

forgot_messages = [
    # Giai đoạn 1
    ('f1', '1. Bấm "Quên MK?" & Nhập Email', u_x, ui_x, 135, False, False),
    ('f2', '2. Gửi yêu cầu cấp lại mã (email)', ui_x, act_x, 160, False, False),
    ('f3', '3. createPasswordResetOtp(email)', act_x, svc_x, 185, False, False),
    ('f4', '4. findUserByEmail(email)', svc_x, db_x, 205, False, False),
    
    ('f5a', '5a. return null (Email không tồn tại)', db_x, svc_x, 230, True, True),
    ('f6a', '6a. return { success: false, error: "Email không tồn tại!" }', svc_x, ui_x, 255, True, True),
    ('f7a', '7a. Báo lỗi trên giao diện', ui_x, u_x, 275, True, True),
    
    ('f5b', '5b. [else] Lưu OTP vào bảng PasswordResetToken (hạn 15p)', svc_x, db_x, 300, False, False),
    ('f6b', '6b. sendOtpEmail(to: email, otp)', svc_x, mail_x, 325, False, False),
    ('f7b', '7b. Gửi email thành công', mail_x, svc_x, 350, True, True),
    ('f8b', '8b. return { success: true } -> Chuyển sang Bước 2', svc_x, ui_x, 375, True, True),
    
    # Giai đoạn 2
    ('f9', '9. Nhập OTP, Mật khẩu mới & bấm Xác nhận', u_x, ui_x, 435, False, False),
    ('f10', '10. Gửi dữ liệu đổi mật khẩu (email, otp, newPassword)', ui_x, act_x, 460, False, False),
    ('f11', '11. verifyAndResetPassword(...)', act_x, svc_x, 485, False, False),
    ('f12', '12. findValidResetToken(token, email)', svc_x, db_x, 510, False, False),
    
    ('f13a', '13a. return { success: false, error: "Mã OTP không đúng hoặc hết hạn!" }', db_x, svc_x, 535, True, True),
    ('f14a', '14a. return { success: false, error }', svc_x, ui_x, 555, True, True),
    ('f15a', '15a. Báo lỗi và cho nhập lại', ui_x, u_x, 575, True, True),
    
    ('f13b', '13b. [else] hashPassword(newPassword) [Bcrypt]', svc_x, svc_x + 35, 615, False, False),
    ('f13b_ret', '', svc_x + 35, svc_x, 635, False, True),
    ('f14b', '14b. updateUserPassword() & markOtpUsed()', svc_x, db_x, 660, False, False),
    ('f15b', '15b. return { success: true }', svc_x, ui_x, 690, True, True),
    ('f16b', '16b. Thông báo đổi mật khẩu thành công -> Quay lại Đăng nhập', ui_x, u_x, 720, True, True),
]

forgot_xml = generate_exact_template_xml('HÌNH: BIỂU ĐỒ TUẦN TỰ QUY TRÌNH QUÊN MẬT KHẨU', forgot_lifelines, forgot_messages, forgot_notes, forgot_frags, height=780)

with open('Bieu_Do_Tuan_Tu_Quen_Mat_Khau.drawio', 'w', encoding='utf-8') as f:
    f.write(forgot_xml)

ET.fromstring(forgot_xml)
print("Forgot template XML valid.")
