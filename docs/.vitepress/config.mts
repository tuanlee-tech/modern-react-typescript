import { defineConfig } from 'vitepress'

const isProd = process.env.NODE_ENV === 'production';
const repo = 'modern-react-typescript';
export const base = isProd ? `/${repo}/` : '/';

// https://vitepress.dev/reference/site-config


export default defineConfig({
  title: 'React TypeScript 6.0',
  description: 'Xây Dựng Ứng Dụng Cấp Doanh Nghiệp, An Toàn Kiểu Dữ Liệu với React 19, Advanced Hooks và các Pattern Hướng Tới Tương Lai',
  lang: 'vi-VN',
  base: base,
  head: [
    ['meta', { name: 'author', content: 'Lê Văn Tuân' }],
    ['meta', { name: 'keywords', content: 'React, TypeScript, React 19, TypeScript 6, Vite, CRM Dashboard' }],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/logo.svg',

    nav: [
      { text: 'Trang Chủ', link: '/' },
      { text: 'Giới Thiệu', link: '/intro' },
      {
        text: 'Các Phần',
        items: [
          { text: 'Phần 1 — Nền Tảng Hiện Đại', link: '/part1/' },
          { text: 'Phần 2 — Advanced Hooks & React 19', link: '/part2/' },
          { text: 'Phần 3 — Kiến Trúc Production', link: '/part3/' },
          { text: 'Phần 4 — Doanh Nghiệp & Tương Lai', link: '/part4/' },
        ]
      },
    ],

    sidebar: [
      { text: 'Giới Thiệu', link: '/intro' },
      {
        text: 'Phần 1 — Nền Tảng Hiện Đại',
        collapsed: false,
        items: [
          { text: 'Tổng Quan Phần 1', link: '/part1/' },
          { text: 'Chương 1: Thiết Lập Dự Án', link: '/part1/chapter-01' },
          { text: 'Chương 2: Type-Safe Components', link: '/part1/chapter-02' },
          { text: 'Chương 3: Quản Lý State', link: '/part1/chapter-03' },
        ]
      },
      {
        text: 'Phần 2 — Advanced Hooks & React 19',
        collapsed: false,
        items: [
          { text: 'Tổng Quan Phần 2', link: '/part2/' },
          { text: 'Chương 4: Custom Hooks', link: '/part2/chapter-04' },
          { text: 'Chương 5: Actions & Optimistic UI', link: '/part2/chapter-05' },
          { text: 'Chương 6: Forms với Zod', link: '/part2/chapter-06' },
        ]
      },
      {
        text: 'Phần 3 — Kiến Trúc Production',
        collapsed: false,
        items: [
          { text: 'Tổng Quan Phần 3', link: '/part3/' },
          { text: 'Chương 7: Global State', link: '/part3/chapter-07' },
          { text: 'Chương 8: Routing', link: '/part3/chapter-08' },
          { text: 'Chương 9: Performance', link: '/part3/chapter-09' },
        ]
      },
      {
        text: 'Phần 4 — Doanh Nghiệp & Tương Lai',
        collapsed: false,
        items: [
          { text: 'Tổng Quan Phần 4', link: '/part4/' },
          { text: 'Chương 10: Testing', link: '/part4/chapter-10' },
          { text: 'Chương 11: Cấu Trúc Dự Án', link: '/part4/chapter-11' },
          { text: 'Chương 12: Deploy & Migration', link: '/part4/chapter-12' },
        ]
      },
      { text: 'Kết Luận', link: '/conclusion' },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/tuanlee-tech/modern-react-typescript' }
    ],

    footer: {
      message: 'Xuất bản năm 2026 bởi Lê Văn Tuân',
      copyright: '© 2026 Lê Văn Tuân. All rights reserved.'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/tuanlee-tech/modern-react-typescript/edit/main/docs/:path',
      text: 'Chỉnh sửa trang này'
    },

    lastUpdated: {
      text: 'Cập nhật lần cuối',
    },

    outline: {
      label: 'Mục lục',
      level: [2, 3]
    },

    docFooter: {
      prev: 'Trang trước',
      next: 'Trang tiếp'
    },
  },
  cleanUrls: true,
  lastUpdated: true,
  vite: {
    build: {
      chunkSizeWarningLimit: 2000,
    }
  }
})
