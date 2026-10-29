import { prisma, isDbAlive } from "@/lib/prisma";
import { MaterialType } from "@prisma/client";
import type { SessionPayload } from "@/lib/auth";
import { isAdmin, isSchoolManager, isTeacherOrTA } from "@/lib/permissions";

const globalMaterialsStore = globalThis as unknown as {
  demoFolders?: any[];
  demoMaterials?: any[];
};

if (!globalMaterialsStore.demoFolders) {
  globalMaterialsStore.demoFolders = [
    {
      id: "demo-folder-lvl-high",
      name: "📚 Sách giáo khoa Mindset for IELTS Level 3",
      description: "Bộ giáo trình chuẩn Cambridge cho các lớp High-Level (Band 6.5 - 7.5+)",
      classId: null,
      ieltsLevelId: "lvl-advanced",
      levelName: "High Level (Band 6.5 - 7.5)",
      parentId: null,
      fileCount: 1,
      subFolderCount: 1,
      isInherited: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-folder-lvl-high-audio",
      name: "🎧 Audio bài nghe (Tracks 01 - 25)",
      description: "Toàn bộ file âm thanh bài nghe của Mindset for IELTS Level 3",
      classId: null,
      ieltsLevelId: "lvl-advanced",
      levelName: "High Level (Band 6.5 - 7.5)",
      parentId: "demo-folder-lvl-high",
      fileCount: 2,
      subFolderCount: 0,
      isInherited: true,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-folder-1",
      name: "Buổi 01 - Giới thiệu cấu trúc đề thi IELTS",
      description: "Tài liệu tổng quan và hướng dẫn học viên",
      classId: "demo-class-1",
      fileCount: 2,
      subFolderCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "demo-folder-2",
      name: "Buổi 02 - IELTS Reading: Matching Headings",
      description: "Bài tập và tài liệu bổ trợ kỹ năng đọc",
      classId: "demo-class-1",
      fileCount: 1,
      subFolderCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

if (!globalMaterialsStore.demoMaterials) {
  globalMaterialsStore.demoMaterials = [
    {
      id: "demo-mat-high-book",
      folderId: "demo-folder-lvl-high",
      title: "Mindset for IELTS Level 3 Student's Book (PDF)",
      fileName: "Mindset_for_IELTS_Level_3_Students_Book.pdf",
      fileUrl: "/sample-mindset.pdf",
      fileSize: 2155089,
      fileType: "PDF",
      mimeType: "application/pdf",
      downloadCount: 88,
      uploadedById: "SYSTEM",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-mat-high-audio-1",
      folderId: "demo-folder-lvl-high-audio",
      title: "Track 01 - Unit 1: Urban and Rural Life",
      fileName: "Track_01_Unit_1.mp3",
      fileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      fileSize: 3450000,
      fileType: "AUDIO",
      mimeType: "audio/mpeg",
      downloadCount: 42,
      uploadedById: "SYSTEM",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-mat-high-audio-2",
      folderId: "demo-folder-lvl-high-audio",
      title: "Track 02 - Unit 2: Men and Women",
      fileName: "Track_02_Unit_2.mp3",
      fileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      fileSize: 4120000,
      fileType: "AUDIO",
      mimeType: "audio/mpeg",
      downloadCount: 39,
      uploadedById: "SYSTEM",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-mat-1",
      folderId: "demo-folder-1",
      title: "Giáo trình IELTS Master Band 6.5+ Unit 1",
      fileName: "Giao_trinh_IELTS_Unit_1.pdf",
      fileUrl: "/sample-mindset.pdf",
      fileSize: 2155089,
      fileType: "PDF",
      mimeType: "application/pdf",
      downloadCount: 12,
      uploadedById: "teacher-1",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: "demo-mat-2",
      folderId: "demo-folder-1",
      title: "Audio Luyện nghe Section 1",
      fileName: "Listening_Section_1.mp3",
      fileUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      fileSize: 3145728,
      fileType: "AUDIO",
      mimeType: "audio/mpeg",
      downloadCount: 8,
      uploadedById: "teacher-1",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function getMaterialFoldersService(params: {
  classId?: string;
  ieltsLevelId?: string;
  parentId?: string | null;
}): Promise<{ success: boolean; error?: string; folders: any[] }> {
  if (!(await isDbAlive())) {
    const folders = (globalMaterialsStore.demoFolders || []).filter((f) => {
      if (!f.isActive) return false;

      if (params.parentId) {
        return f.parentId === params.parentId;
      }

      if (params.parentId === null || params.parentId === undefined) {
        if (f.parentId) return false;

        if (params.classId) {
          return f.classId === params.classId || (!f.classId && f.ieltsLevelId);
        }
        if (params.ieltsLevelId) {
          return !f.classId && f.ieltsLevelId === params.ieltsLevelId;
        }
      }

      return true;
    });
    return { success: true, folders };
  }

  try {
    const whereClause: any = {
      isActive: true,
    };

    if (params.parentId !== undefined) {
      whereClause.parentId = params.parentId;
    } else {
      whereClause.parentId = null;
    }

    if (params.classId) {
      if (params.parentId === null || params.parentId === undefined) {
        const cls = await prisma.class.findUnique({
          where: { id: params.classId },
          select: { id: true, level: true, ieltsLevelId: true },
        });

        let targetLevelId = cls?.ieltsLevelId;
        if (!targetLevelId && cls?.level) {
          const matchedLvl = await prisma.ieltsLevel.findFirst({
            where: {
              isActive: true,
              OR: [
                { name: { contains: cls.level, mode: "insensitive" } },
                { code: { contains: cls.level, mode: "insensitive" } },
              ],
            },
            select: { id: true },
          });
          if (matchedLvl) targetLevelId = matchedLvl.id;
        }

        if (targetLevelId) {
          whereClause.OR = [
            { classId: params.classId },
            { ieltsLevelId: targetLevelId, classId: null },
          ];
        } else {
          whereClause.classId = params.classId;
        }
      }
    } else if (params.ieltsLevelId) {
      whereClause.ieltsLevelId = params.ieltsLevelId;
      whereClause.classId = null;
    }

    const folders = await prisma.materialFolder.findMany({
      where: whereClause,
      include: {
        materials: {
          where: { isActive: true },
          select: { id: true },
        },
        subFolders: {
          where: { isActive: true },
          select: { id: true },
        },
        ieltsLevel: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    const formatted = folders.map((f) => ({
      id: f.id,
      name: f.name,
      description: f.description,
      classId: f.classId,
      ieltsLevelId: f.ieltsLevelId,
      parentId: f.parentId,
      createdById: f.createdById,
      isInherited: !f.classId && !!f.ieltsLevelId,
      levelName: f.ieltsLevel?.name || null,
      fileCount: f.materials.length,
      subFolderCount: f.subFolders.length,
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }));

    return { success: true, folders: formatted };
  } catch (err: any) {
    console.error("[getMaterialFoldersService] Lỗi:", err);
    return {
      success: false,
      error: err.message || "Không thể tải danh sách thư mục!",
      folders: [],
    };
  }
}

export async function createMaterialFolderService(
  session: SessionPayload,
  data: {
    name: string;
    description?: string;
    classId?: string;
    ieltsLevelId?: string;
    parentId?: string | null;
  }
): Promise<{ success: boolean; error?: string; folder?: any }> {
  if (!data.name || !data.name.trim()) {
    return { success: false, error: "Tên thư mục không được để trống!" };
  }

  if (!(await isDbAlive())) {
    const newFolder = {
      id: `folder-${Date.now()}`,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      classId: data.classId || null,
      ieltsLevelId: data.ieltsLevelId || null,
      parentId: data.parentId || null,
      createdById: session.userId || "SYSTEM",
      fileCount: 0,
      subFolderCount: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    globalMaterialsStore.demoFolders = [
      newFolder,
      ...(globalMaterialsStore.demoFolders || []),
    ];
    return { success: true, folder: newFolder };
  }

  try {
    const newFolder = await prisma.materialFolder.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        classId: data.classId || null,
        ieltsLevelId: data.ieltsLevelId || null,
        parentId: data.parentId || null,
        createdById: session.userId || "SYSTEM",
      },
    });

    return { success: true, folder: newFolder };
  } catch (err: any) {
    console.error("[createMaterialFolderService] Lỗi:", err);
    return { success: false, error: err.message || "Không thể tạo thư mục!" };
  }
}

export async function deleteMaterialFolderService(
  folderId: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isDbAlive())) {
    if (globalMaterialsStore.demoFolders) {
      globalMaterialsStore.demoFolders = globalMaterialsStore.demoFolders.filter(
        (f) => f.id !== folderId
      );
    }
    if (globalMaterialsStore.demoMaterials) {
      globalMaterialsStore.demoMaterials = globalMaterialsStore.demoMaterials.filter(
        (m) => m.folderId !== folderId
      );
    }
    return { success: true };
  }

  try {
    await prisma.materialFolder.update({
      where: { id: folderId },
      data: { isActive: false },
    });

    await prisma.learningMaterial.updateMany({
      where: { folderId },
      data: { isActive: false },
    });

    return { success: true };
  } catch (err: any) {
    console.error("[deleteMaterialFolderService] Lỗi:", err);
    return { success: false, error: err.message || "Không thể xóa thư mục!" };
  }
}

export async function getLearningMaterialsService(
  folderId: string
): Promise<{ success: boolean; error?: string; materials: any[] }> {
  if (!(await isDbAlive())) {
    const materials = (globalMaterialsStore.demoMaterials || []).filter(
      (m) => m.isActive && (!folderId || m.folderId === folderId)
    );
    return { success: true, materials };
  }

  try {
    const materials = await prisma.learningMaterial.findMany({
      where: {
        folderId,
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      materials: materials.map((m) => ({
        id: m.id,
        folderId: m.folderId,
        title: m.title,
        fileName: m.fileName,
        fileUrl: m.fileUrl,
        fileSize: m.fileSize,
        fileType: m.fileType,
        mimeType: m.mimeType,
        downloadCount: m.downloadCount,
        uploadedById: m.uploadedById,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  } catch (err: any) {
    console.error("[getLearningMaterialsService] Lỗi:", err);
    return {
      success: false,
      error: err.message || "Không thể tải tài liệu!",
      materials: [],
    };
  }
}

export async function uploadLearningMaterialService(
  session: SessionPayload,
  data: {
    folderId: string;
    title: string;
    fileName: string;
    fileSize: number;
    fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
    fileUrl: string;
    mimeType?: string;
  }
): Promise<{ success: boolean; error?: string; material?: any }> {
  if (!data.folderId || !data.title || !data.fileUrl) {
    return { success: false, error: "Thông tin tài liệu không hợp lệ!" };
  }

  if (!(await isDbAlive())) {
    const newMat = {
      id: `mat-${Date.now()}`,
      folderId: data.folderId,
      title: data.title.trim(),
      fileName: data.fileName,
      fileSize: data.fileSize || 1048576,
      fileType: data.fileType,
      fileUrl: data.fileUrl,
      mimeType:
        data.mimeType || (data.fileType === "AUDIO" ? "audio/mpeg" : "application/pdf"),
      downloadCount: 0,
      uploadedById: session.userId || "SYSTEM",
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    globalMaterialsStore.demoMaterials = [
      newMat,
      ...(globalMaterialsStore.demoMaterials || []),
    ];
    const parentFolder = (globalMaterialsStore.demoFolders || []).find(
      (f) => f.id === data.folderId
    );
    if (parentFolder) {
      parentFolder.fileCount = (parentFolder.fileCount || 0) + 1;
    }
    return { success: true, material: newMat };
  }

  try {
    const material = await prisma.learningMaterial.create({
      data: {
        folderId: data.folderId,
        title: data.title.trim(),
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType as MaterialType,
        fileUrl: data.fileUrl,
        mimeType: data.mimeType || null,
        uploadedById: session.userId || "SYSTEM",
      },
    });

    return { success: true, material };
  } catch (err: any) {
    console.error("[uploadLearningMaterialService] Lỗi:", err);
    return { success: false, error: err.message || "Không thể tải lên tài liệu!" };
  }
}

export async function deleteLearningMaterialService(
  materialId: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await isDbAlive())) {
    if (globalMaterialsStore.demoMaterials) {
      globalMaterialsStore.demoMaterials = globalMaterialsStore.demoMaterials.filter(
        (m) => m.id !== materialId
      );
    }
    return { success: true };
  }

  try {
    await prisma.learningMaterial.update({
      where: { id: materialId },
      data: { isActive: false },
    });

    return { success: true };
  } catch (err: any) {
    console.error("[deleteLearningMaterialService] Lỗi:", err);
    return { success: false, error: err.message || "Không thể xóa tài liệu!" };
  }
}

export async function uploadMultipleLearningMaterialsService(
  session: SessionPayload,
  data: {
    folderId: string;
    materials: Array<{
      title: string;
      fileName: string;
      fileSize: number;
      fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
      fileUrl: string;
      mimeType?: string;
    }>;
  }
): Promise<{ success: boolean; error?: string; count?: number }> {
  if (!data.folderId || !data.materials || data.materials.length === 0) {
    return { success: false, error: "Danh sách tài liệu tải lên không hợp lệ!" };
  }

  if (!(await isDbAlive())) {
    const createdList: any[] = [];
    for (const item of data.materials) {
      const newMat = {
        id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        folderId: data.folderId,
        title: item.title.trim(),
        fileName: item.fileName,
        fileSize: item.fileSize || 1048576,
        fileType: item.fileType,
        fileUrl: item.fileUrl,
        mimeType:
          item.mimeType || (item.fileType === "AUDIO" ? "audio/mpeg" : "application/pdf"),
        downloadCount: 0,
        uploadedById: session.userId || "SYSTEM",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      createdList.push(newMat);
    }
    globalMaterialsStore.demoMaterials = [
      ...createdList,
      ...(globalMaterialsStore.demoMaterials || []),
    ];
    const parentFolder = (globalMaterialsStore.demoFolders || []).find(
      (f) => f.id === data.folderId
    );
    if (parentFolder) {
      parentFolder.fileCount = (parentFolder.fileCount || 0) + createdList.length;
    }
    return { success: true, count: createdList.length };
  }

  try {
    const createdItems = await Promise.all(
      data.materials.map((item) =>
        prisma.learningMaterial.create({
          data: {
            folderId: data.folderId,
            title: item.title.trim(),
            fileName: item.fileName,
            fileSize: item.fileSize,
            fileType: item.fileType as MaterialType,
            fileUrl: item.fileUrl,
            mimeType: item.mimeType || null,
            uploadedById: session.userId || "SYSTEM",
          },
        })
      )
    );

    return { success: true, count: createdItems.length };
  } catch (err: any) {
    console.error("[uploadMultipleLearningMaterialsService] Lỗi:", err);
    return {
      success: false,
      error: err.message || "Không thể tải lên danh sách tài liệu!",
    };
  }
}

export async function updateLearningMaterialService(data: {
  materialId: string;
  title: string;
  fileType?: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
}): Promise<{ success: boolean; error?: string }> {
  if (!(await isDbAlive())) {
    const mat = (globalMaterialsStore.demoMaterials || []).find(
      (m) => m.id === data.materialId
    );
    if (mat) {
      mat.title = data.title.trim();
      if (data.fileType) mat.fileType = data.fileType;
    }
    return { success: true };
  }

  try {
    await prisma.learningMaterial.update({
      where: { id: data.materialId },
      data: {
        title: data.title.trim(),
        fileType: data.fileType as MaterialType | undefined,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("[updateLearningMaterialService] Lỗi:", err);
    return { success: false, error: err.message || "Không thể cập nhật tài liệu!" };
  }
}

export async function incrementMaterialDownloadCountService(
  materialId: string
): Promise<{ success: boolean }> {
  if (!(await isDbAlive())) {
    const mat = (globalMaterialsStore.demoMaterials || []).find(
      (m) => m.id === materialId
    );
    if (mat) mat.downloadCount = (mat.downloadCount || 0) + 1;
    return { success: true };
  }
  try {
    await prisma.learningMaterial.update({
      where: { id: materialId },
      data: { downloadCount: { increment: 1 } },
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function distributeLearningMaterialsService(
  session: SessionPayload,
  data: {
    distributionMode: "BY_LEVEL" | "BY_CLASSES" | "ALL_CLASSES";
    targetLevels?: string[];
    targetClassIds?: string[];
    folderName: string;
    folderDescription?: string;
    materials: Array<{
      title: string;
      fileName: string;
      fileSize: number;
      fileType: "PDF" | "AUDIO" | "DOCUMENT" | "VIDEO" | "OTHER";
      fileUrl: string;
      mimeType?: string;
    }>;
  }
): Promise<{
  success: boolean;
  error?: string;
  targetClassCount?: number;
  classNames?: string[];
  materialCount?: number;
  totalDistributed?: number;
}> {
  const isTeacher = isTeacherOrTA(session);
  const isManager = isSchoolManager(session);

  if (!data.materials || data.materials.length === 0) {
    return {
      success: false,
      error: "Danh sách tài liệu phân phối không được để trống!",
    };
  }

  const cleanFolderName = data.folderName?.trim() || "Tài liệu học tập chung";

  if (!(await isDbAlive())) {
    const globalClasses = (globalThis as any).demoClasses || [
      {
        id: "demo-class-1",
        name: "IELTS Bứt Phá - 10A1",
        level: "5.5 - 6.5",
        isActive: true,
        assignments: [
          {
            userId: "teacher-1",
            roleInClass: "TEACHER",
            staff: { username: "teacher1", email: "gv.nguyenvan@simpace.vn" },
          },
        ],
      },
      {
        id: "demo-class-2",
        name: "IELTS Nền Tảng - 11B2",
        level: "4.0 - 5.0",
        isActive: true,
        assignments: [],
      },
    ];

    let targetClasses: any[] = [];
    if (
      data.distributionMode === "BY_LEVEL" &&
      data.targetLevels &&
      data.targetLevels.length > 0
    ) {
      targetClasses = globalClasses.filter(
        (c: any) =>
          c.isActive &&
          data.targetLevels!.some(
            (lvl) =>
              (c.level || "").toLowerCase().includes(lvl.toLowerCase()) ||
              (c.name || "").toLowerCase().includes(lvl.toLowerCase())
          )
      );
    } else if (
      data.distributionMode === "BY_CLASSES" &&
      data.targetClassIds &&
      data.targetClassIds.length > 0
    ) {
      targetClasses = globalClasses.filter(
        (c: any) => c.isActive && data.targetClassIds!.includes(c.id)
      );
    } else {
      targetClasses = globalClasses.filter((c: any) => c.isActive);
    }

    if (isTeacher) {
      targetClasses = targetClasses.filter((c: any) =>
        c.assignments?.some(
          (a: any) =>
            a.userId === session.userId ||
            a.staff?.id === session.userId ||
            a.staff?.username === session.username ||
            (session.email && a.staff?.email === session.email)
        )
      );
    } else if (isManager) {
      targetClasses = targetClasses.filter(
        (c: any) => c.school?.managerId === session.userId
      );
    }

    if (targetClasses.length === 0) {
      return {
        success: false,
        error: isTeacher
          ? "Bạn không có quyền phân phối học liệu ngoài các lớp bạn được phân công phụ trách!"
          : "Không tìm thấy lớp học nào phù hợp với phạm vi phân quyền của bạn!",
      };
    }

    let totalCreatedMaterials = 0;
    for (const cls of targetClasses) {
      let folder = (globalMaterialsStore.demoFolders || []).find(
        (f) =>
          f.classId === cls.id &&
          f.name.toLowerCase() === cleanFolderName.toLowerCase() &&
          f.isActive
      );

      if (!folder) {
        folder = {
          id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: cleanFolderName,
          description:
            data.folderDescription || `Phân phối tự động cho lớp ${cls.name}`,
          classId: cls.id,
          fileCount: 0,
          subFolderCount: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        globalMaterialsStore.demoFolders = [
          folder,
          ...(globalMaterialsStore.demoFolders || []),
        ];
      }

      const newMatItems = data.materials.map((m) => ({
        id: `mat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        folderId: folder.id,
        title: m.title.trim(),
        fileName: m.fileName,
        fileSize: m.fileSize || 1048576,
        fileType: m.fileType,
        fileUrl: m.fileUrl,
        mimeType:
          m.mimeType || (m.fileType === "AUDIO" ? "audio/mpeg" : "application/pdf"),
        downloadCount: 0,
        uploadedById: session.userId || "SYSTEM",
        isActive: true,
        createdAt: new Date().toISOString(),
      }));

      folder.fileCount = (folder.fileCount || 0) + newMatItems.length;
      globalMaterialsStore.demoMaterials = [
        ...newMatItems,
        ...(globalMaterialsStore.demoMaterials || []),
      ];
      totalCreatedMaterials += newMatItems.length;
    }

    return {
      success: true,
      targetClassCount: targetClasses.length,
      classNames: targetClasses.map((c) => c.name),
      materialCount: data.materials.length,
      totalDistributed: totalCreatedMaterials,
    };
  }

  try {
    const whereClause: any = { isActive: true };

    if (isTeacher) {
      whereClause.assignments = { some: { userId: session.userId } };
    } else if (isManager) {
      whereClause.school = { managerId: session.userId };
    }

    if (
      data.distributionMode === "BY_LEVEL" &&
      data.targetLevels &&
      data.targetLevels.length > 0
    ) {
      whereClause.AND = [
        ...(whereClause.AND || []),
        {
          OR: data.targetLevels.map((lvl) => ({
            level: { contains: lvl, mode: "insensitive" },
          })),
        },
      ];
    } else if (
      data.distributionMode === "BY_CLASSES" &&
      data.targetClassIds &&
      data.targetClassIds.length > 0
    ) {
      whereClause.id = { in: data.targetClassIds };
    }

    const targetClasses = await prisma.class.findMany({
      where: whereClause,
      select: { id: true, name: true, level: true },
    });

    if (targetClasses.length === 0) {
      return {
        success: false,
        error: isTeacher
          ? "Bạn không có quyền phân phối học liệu ngoài các lớp bạn được phân công phụ trách!"
          : "Không tìm thấy lớp học nào phù hợp với phạm vi phân quyền của bạn!",
      };
    }

    let totalCreatedMaterials = 0;

    for (const cls of targetClasses) {
      let folder = await prisma.materialFolder.findFirst({
        where: {
          classId: cls.id,
          name: cleanFolderName,
          isActive: true,
        },
      });

      if (!folder) {
        folder = await prisma.materialFolder.create({
          data: {
            classId: cls.id,
            name: cleanFolderName,
            description:
              data.folderDescription?.trim() ||
              `Phân phối tự động cho lớp ${cls.name}`,
            createdById: session.userId || "SYSTEM",
          },
        });
      }

      const createdMats = await Promise.all(
        data.materials.map((m) =>
          prisma.learningMaterial.create({
            data: {
              folderId: folder!.id,
              title: m.title.trim(),
              fileName: m.fileName,
              fileSize: m.fileSize,
              fileType: m.fileType as MaterialType,
              fileUrl: m.fileUrl,
              mimeType: m.mimeType || null,
              uploadedById: session.userId || "SYSTEM",
            },
          })
        )
      );

      totalCreatedMaterials += createdMats.length;
    }

    return {
      success: true,
      targetClassCount: targetClasses.length,
      classNames: targetClasses.map((c) => c.name),
      materialCount: data.materials.length,
      totalDistributed: totalCreatedMaterials,
    };
  } catch (err: any) {
    console.error("[distributeLearningMaterialsService] Lỗi:", err);
    return {
      success: false,
      error: err.message || "Không thể phân phối tài liệu hàng loạt!",
    };
  }
}

export async function uploadCoursebookPackageService(
  session: SessionPayload,
  data: {
    targetType: "CLASS" | "LEVEL" | "MULTI_CLASSES";
    classId?: string;
    ieltsLevelId?: string;
    targetLevels?: string[];
    targetClassIds?: string[];
    parentId?: string | null;
    packageTitle: string;
    packageDescription?: string;
    bookFile: {
      title?: string;
      fileName: string;
      fileSize: number;
      fileUrl: string;
      mimeType?: string;
    };
    audioFiles: Array<{
      title: string;
      fileName: string;
      fileSize: number;
      fileUrl: string;
      mimeType?: string;
    }>;
    audioFolderName?: string;
    answerKeyFile?: {
      title?: string;
      fileName: string;
      fileSize: number;
      fileUrl: string;
      mimeType?: string;
    };
  }
): Promise<{
  success: boolean;
  error?: string;
  folderId?: string;
  audioFolderId?: string;
  count?: number;
  classNames?: string[];
}> {
  if (data.targetType === "LEVEL" && !isAdmin(session)) {
    return {
      success: false,
      error:
        "Chỉ Quản trị viên (ADMIN) mới có quyền nạp giáo trình chuẩn vào Kho Trình độ dùng chung toàn trung tâm!",
    };
  }

  if (!data.packageTitle || !data.packageTitle.trim()) {
    return { success: false, error: "Tên bộ sách không được để trống!" };
  }

  if (!data.bookFile || !data.bookFile.fileUrl) {
    return { success: false, error: "Vui lòng chọn tệp Sách giáo khoa (PDF)!" };
  }

  const rawTitle = data.packageTitle.trim();
  const parentFolderName = rawTitle.startsWith("📚") ? rawTitle : `📚 ${rawTitle}`;
  const audioFolderName =
    data.audioFolderName?.trim() || "🎧 Audio bài nghe (Tracks)";
  const bookMaterialTitle = data.bookFile.title?.trim() || `${rawTitle} (PDF)`;

  if (!(await isDbAlive())) {
    if (data.targetType === "CLASS" && data.classId) {
      const parentFolder = {
        id: `folder-pkg-${Date.now()}-book`,
        name: parentFolderName,
        description:
          data.packageDescription ||
          "Bộ sách giáo khoa và đĩa nghe audio chính thức",
        classId: data.classId,
        ieltsLevelId: null,
        parentId: data.parentId || null,
        fileCount: 1,
        subFolderCount: 1,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const bookMat = {
        id: `mat-pkg-${Date.now()}-pdf`,
        folderId: parentFolder.id,
        title: bookMaterialTitle,
        fileName: data.bookFile.fileName,
        fileSize: data.bookFile.fileSize || 10485760,
        fileType: "PDF",
        fileUrl: data.bookFile.fileUrl,
        mimeType: data.bookFile.mimeType || "application/pdf",
        downloadCount: 0,
        uploadedById: session.userId || "SYSTEM",
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const audioSubFolder = {
        id: `folder-pkg-${Date.now()}-audio`,
        name: audioFolderName,
        description: `Danh sách ${data.audioFiles.length} bài nghe cho bộ sách ${rawTitle}`,
        classId: data.classId,
        ieltsLevelId: null,
        parentId: parentFolder.id,
        fileCount: data.audioFiles.length,
        subFolderCount: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const audioMats = data.audioFiles.map((af, idx) => ({
        id: `mat-pkg-${Date.now()}-audio-${idx}`,
        folderId: audioSubFolder.id,
        title: af.title.trim() || `Track ${(idx + 1).toString().padStart(2, "0")}`,
        fileName: af.fileName,
        fileSize: af.fileSize || 3145728,
        fileType: "AUDIO",
        fileUrl: af.fileUrl,
        mimeType: af.mimeType || "audio/mpeg",
        downloadCount: 0,
        uploadedById: session.userId || "SYSTEM",
        isActive: true,
        createdAt: new Date().toISOString(),
      }));

      const extraMaterials: any[] = [];
      if (data.answerKeyFile) {
        parentFolder.fileCount += 1;
        extraMaterials.push({
          id: `mat-pkg-${Date.now()}-ans`,
          folderId: parentFolder.id,
          title:
            data.answerKeyFile.title?.trim() ||
            `${rawTitle} - Đáp án (Answer Key)`,
          fileName: data.answerKeyFile.fileName,
          fileSize: data.answerKeyFile.fileSize || 2097152,
          fileType: "PDF",
          fileUrl: data.answerKeyFile.fileUrl,
          mimeType: data.answerKeyFile.mimeType || "application/pdf",
          downloadCount: 0,
          uploadedById: session.userId || "SYSTEM",
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }

      globalMaterialsStore.demoFolders = [
        parentFolder,
        audioSubFolder,
        ...(globalMaterialsStore.demoFolders || []),
      ];
      globalMaterialsStore.demoMaterials = [
        bookMat,
        ...extraMaterials,
        ...audioMats,
        ...(globalMaterialsStore.demoMaterials || []),
      ];

      return {
        success: true,
        folderId: parentFolder.id,
        audioFolderId: audioSubFolder.id,
      };
    } else if (data.targetType === "LEVEL" && data.ieltsLevelId) {
      const parentFolder = {
        id: `folder-lvl-${Date.now()}-book`,
        name: parentFolderName,
        description:
          data.packageDescription || "Giáo trình chuẩn do Trung tâm phê duyệt",
        classId: null,
        ieltsLevelId: data.ieltsLevelId,
        levelName: "Giáo trình chuẩn Trình độ",
        parentId: data.parentId || null,
        fileCount: 1,
        subFolderCount: 1,
        isInherited: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const bookMat = {
        id: `mat-lvl-${Date.now()}-pdf`,
        folderId: parentFolder.id,
        title: bookMaterialTitle,
        fileName: data.bookFile.fileName,
        fileSize: data.bookFile.fileSize || 10485760,
        fileType: "PDF",
        fileUrl: data.bookFile.fileUrl,
        mimeType: data.bookFile.mimeType || "application/pdf",
        downloadCount: 0,
        uploadedById: session.userId || "SYSTEM",
        isActive: true,
        createdAt: new Date().toISOString(),
      };

      const audioSubFolder = {
        id: `folder-lvl-${Date.now()}-audio`,
        name: audioFolderName,
        description: `Danh sách ${data.audioFiles.length} bài nghe cho bộ sách ${rawTitle}`,
        classId: null,
        ieltsLevelId: data.ieltsLevelId,
        levelName: "Giáo trình chuẩn Trình độ",
        parentId: parentFolder.id,
        fileCount: data.audioFiles.length,
        subFolderCount: 0,
        isInherited: true,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const audioMats = data.audioFiles.map((af, idx) => ({
        id: `mat-lvl-${Date.now()}-audio-${idx}`,
        folderId: audioSubFolder.id,
        title: af.title.trim() || `Track ${(idx + 1).toString().padStart(2, "0")}`,
        fileName: af.fileName,
        fileSize: af.fileSize || 3145728,
        fileType: "AUDIO",
        fileUrl: af.fileUrl,
        mimeType: af.mimeType || "audio/mpeg",
        downloadCount: 0,
        uploadedById: session.userId || "SYSTEM",
        isActive: true,
        createdAt: new Date().toISOString(),
      }));

      const extraMaterials: any[] = [];
      if (data.answerKeyFile) {
        parentFolder.fileCount += 1;
        extraMaterials.push({
          id: `mat-lvl-${Date.now()}-ans`,
          folderId: parentFolder.id,
          title:
            data.answerKeyFile.title?.trim() ||
            `${rawTitle} - Đáp án (Answer Key)`,
          fileName: data.answerKeyFile.fileName,
          fileSize: data.answerKeyFile.fileSize || 2097152,
          fileType: "PDF",
          fileUrl: data.answerKeyFile.fileUrl,
          mimeType: data.answerKeyFile.mimeType || "application/pdf",
          downloadCount: 0,
          uploadedById: session.userId || "SYSTEM",
          isActive: true,
          createdAt: new Date().toISOString(),
        });
      }

      globalMaterialsStore.demoFolders = [
        parentFolder,
        audioSubFolder,
        ...(globalMaterialsStore.demoFolders || []),
      ];
      globalMaterialsStore.demoMaterials = [
        bookMat,
        ...extraMaterials,
        ...audioMats,
        ...(globalMaterialsStore.demoMaterials || []),
      ];

      return {
        success: true,
        folderId: parentFolder.id,
        audioFolderId: audioSubFolder.id,
      };
    }
  }

  try {
    if (data.targetType === "CLASS" && data.classId) {
      const parentFolder = await prisma.materialFolder.create({
        data: {
          name: parentFolderName,
          description:
            data.packageDescription ||
            "Bộ sách giáo khoa và đĩa nghe audio chính thức",
          classId: data.classId,
          parentId: data.parentId || null,
          createdById: session.userId || "SYSTEM",
        },
      });

      await prisma.learningMaterial.create({
        data: {
          folderId: parentFolder.id,
          title: bookMaterialTitle,
          fileName: data.bookFile.fileName,
          fileSize: data.bookFile.fileSize,
          fileType: "PDF",
          fileUrl: data.bookFile.fileUrl,
          mimeType: data.bookFile.mimeType || "application/pdf",
          uploadedById: session.userId || "SYSTEM",
        },
      });

      const audioSubFolder = await prisma.materialFolder.create({
        data: {
          name: audioFolderName,
          description: `Danh sách ${data.audioFiles.length} bài nghe cho bộ sách ${rawTitle}`,
          classId: data.classId,
          parentId: parentFolder.id,
          createdById: session.userId || "SYSTEM",
        },
      });

      if (data.audioFiles.length > 0) {
        await Promise.all(
          data.audioFiles.map((af, idx) =>
            prisma.learningMaterial.create({
              data: {
                folderId: audioSubFolder.id,
                title:
                  af.title.trim() ||
                  `Track ${(idx + 1).toString().padStart(2, "0")}`,
                fileName: af.fileName,
                fileSize: af.fileSize,
                fileType: "AUDIO",
                fileUrl: af.fileUrl,
                mimeType: af.mimeType || "audio/mpeg",
                uploadedById: session.userId || "SYSTEM",
              },
            })
          )
        );
      }

      return {
        success: true,
        folderId: parentFolder.id,
        audioFolderId: audioSubFolder.id,
      };
    } else if (data.targetType === "LEVEL" && data.ieltsLevelId) {
      const parentFolder = await prisma.materialFolder.create({
        data: {
          name: parentFolderName,
          description:
            data.packageDescription ||
            "Giáo trình chuẩn cấp Trình độ do Trung tâm phê duyệt",
          ieltsLevelId: data.ieltsLevelId,
          parentId: data.parentId || null,
          createdById: session.userId || "SYSTEM",
        },
      });

      await prisma.learningMaterial.create({
        data: {
          folderId: parentFolder.id,
          title: bookMaterialTitle,
          fileName: data.bookFile.fileName,
          fileSize: data.bookFile.fileSize,
          fileType: "PDF",
          fileUrl: data.bookFile.fileUrl,
          mimeType: data.bookFile.mimeType || "application/pdf",
          uploadedById: session.userId || "SYSTEM",
        },
      });

      if (data.answerKeyFile) {
        await prisma.learningMaterial.create({
          data: {
            folderId: parentFolder.id,
            title:
              data.answerKeyFile.title?.trim() ||
              `${rawTitle} - Đáp án (Answer Key)`,
            fileName: data.answerKeyFile.fileName,
            fileSize: data.answerKeyFile.fileSize,
            fileType: "PDF",
            fileUrl: data.answerKeyFile.fileUrl,
            mimeType: data.answerKeyFile.mimeType || "application/pdf",
            uploadedById: session.userId || "SYSTEM",
          },
        });
      }

      const audioSubFolder = await prisma.materialFolder.create({
        data: {
          name: audioFolderName,
          description: `Danh sách ${data.audioFiles.length} bài nghe cho bộ sách ${rawTitle}`,
          ieltsLevelId: data.ieltsLevelId,
          parentId: parentFolder.id,
          createdById: session.userId || "SYSTEM",
        },
      });

      if (data.audioFiles.length > 0) {
        await Promise.all(
          data.audioFiles.map((af, idx) =>
            prisma.learningMaterial.create({
              data: {
                folderId: audioSubFolder.id,
                title:
                  af.title.trim() ||
                  `Track ${(idx + 1).toString().padStart(2, "0")}`,
                fileName: af.fileName,
                fileSize: af.fileSize,
                fileType: "AUDIO",
                fileUrl: af.fileUrl,
                mimeType: af.mimeType || "audio/mpeg",
                uploadedById: session.userId || "SYSTEM",
              },
            })
          )
        );
      }

      return {
        success: true,
        folderId: parentFolder.id,
        audioFolderId: audioSubFolder.id,
      };
    } else if (data.targetType === "MULTI_CLASSES") {
      const whereClause: any = { isActive: true };

      if (data.targetLevels && data.targetLevels.length > 0) {
        whereClause.OR = data.targetLevels.map((lvl) => ({
          level: { contains: lvl, mode: "insensitive" },
        }));
      } else if (data.targetClassIds && data.targetClassIds.length > 0) {
        whereClause.id = { in: data.targetClassIds };
      }

      const targetClasses = await prisma.class.findMany({
        where: whereClause,
        select: { id: true, name: true },
      });

      if (targetClasses.length === 0) {
        return {
          success: false,
          error: "Không tìm thấy lớp học nào để phân phối bộ sách!",
        };
      }

      for (const cls of targetClasses) {
        const parentFolder = await prisma.materialFolder.create({
          data: {
            name: parentFolderName,
            description:
              data.packageDescription ||
              `Bộ sách giáo khoa và đĩa nghe audio cho lớp ${cls.name}`,
            classId: cls.id,
            createdById: session.userId || "SYSTEM",
          },
        });

        await prisma.learningMaterial.create({
          data: {
            folderId: parentFolder.id,
            title: bookMaterialTitle,
            fileName: data.bookFile.fileName,
            fileSize: data.bookFile.fileSize,
            fileType: "PDF",
            fileUrl: data.bookFile.fileUrl,
            mimeType: data.bookFile.mimeType || "application/pdf",
            uploadedById: session.userId || "SYSTEM",
          },
        });

        const audioSubFolder = await prisma.materialFolder.create({
          data: {
            name: audioFolderName,
            description: `Danh sách ${data.audioFiles.length} bài nghe cho bộ sách ${rawTitle}`,
            classId: cls.id,
            parentId: parentFolder.id,
            createdById: session.userId || "SYSTEM",
          },
        });

        if (data.audioFiles.length > 0) {
          await Promise.all(
            data.audioFiles.map((af, idx) =>
              prisma.learningMaterial.create({
                data: {
                  folderId: audioSubFolder.id,
                  title:
                    af.title.trim() ||
                    `Track ${(idx + 1).toString().padStart(2, "0")}`,
                  fileName: af.fileName,
                  fileSize: af.fileSize,
                  fileType: "AUDIO",
                  fileUrl: af.fileUrl,
                  mimeType: af.mimeType || "audio/mpeg",
                  uploadedById: session.userId || "SYSTEM",
                },
              })
            )
          );
        }
      }

      return {
        success: true,
        count: targetClasses.length,
        classNames: targetClasses.map((c) => c.name),
      };
    }

    return { success: false, error: "Thông tin phân phối không hợp lệ!" };
  } catch (err: any) {
    console.error("[uploadCoursebookPackageService] Lỗi:", err);
    return {
      success: false,
      error: err.message || "Không thể tải lên bộ sách giáo khoa!",
    };
  }
}

export async function getLevelRepositoryFoldersService(): Promise<{
  success: boolean;
  error?: string;
  folders: any[];
}> {
  if (!(await isDbAlive())) {
    const folders = (globalMaterialsStore.demoFolders || []).filter(
      (f) => f.isActive && !f.classId && f.ieltsLevelId && !f.parentId
    );
    return { success: true, folders };
  }
  try {
    const folders = await prisma.materialFolder.findMany({
      where: {
        isActive: true,
        classId: null,
        ieltsLevelId: { not: null },
        parentId: null,
      },
      include: {
        materials: { where: { isActive: true }, select: { id: true } },
        subFolders: { where: { isActive: true }, select: { id: true } },
        ieltsLevel: {
          select: { id: true, name: true, code: true, minScore: true, maxScore: true },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return {
      success: true,
      folders: folders.map((f) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        classId: null,
        ieltsLevelId: f.ieltsLevelId,
        levelName: f.ieltsLevel?.name || "Trình độ chung",
        levelCode: f.ieltsLevel?.code,
        minScore: f.ieltsLevel?.minScore,
        maxScore: f.ieltsLevel?.maxScore,
        fileCount: f.materials.length,
        subFolderCount: f.subFolders.length,
        createdAt: f.createdAt.toISOString(),
        updatedAt: f.updatedAt.toISOString(),
      })),
    };
  } catch (err: any) {
    console.error("[getLevelRepositoryFoldersService] Lỗi:", err);
    return { success: false, error: err.message, folders: [] };
  }
}
