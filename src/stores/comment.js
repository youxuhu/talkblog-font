import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as commentService from '@/services/comment'

export const useCommentStore = defineStore('comment', () => {
  const comments = ref([])
  const myComments = ref([])
  const adminComments = ref([])
  const stats = ref(null)
  const loading = ref(false)
  const total = ref(0)
  const myTotal = ref(0)
  const adminTotal = ref(0)
  const query = ref({ page: 1, size: 10 })
  const adminQuery = ref({ page: 1, size: 10, keyword: '', status: '', blogId: '' })
  const reports = ref([])
  const reportTotal = ref(0)
  const reportQuery = ref({ page: 1, size: 10, status: '' })

  const commentCount = computed(() => comments.value.length)

  async function fetchCommentsForBlog(blogId, opts = {}) {
    loading.value = true
    try {
      const result = await commentService.fetchComments({
        blogId,
        page: opts.page || query.value.page,
        size: opts.size || query.value.size,
        parentId: opts.parentId,
        status: opts.status,
      })
      comments.value = result?.data?.list || []
      total.value = result?.data?.total || 0
      return result
    } finally {
      loading.value = false
    }
  }

  async function createNewComment(payload) {
    loading.value = true
    try {
      const result = await commentService.createComment(payload)
      return result
    } finally {
      loading.value = false
    }
  }

  async function likeComment(commentId) {
    return commentService.likeComment(commentId)
  }

  async function deleteComment(commentId) {
    loading.value = true
    try {
      const result = await commentService.deleteComment(commentId)
      comments.value = comments.value.filter((c) => c.commentId !== commentId)
      return result
    } finally {
      loading.value = false
    }
  }

  async function fetchMyComments(opts = {}) {
    loading.value = true
    try {
      const result = await commentService.fetchMyComments({
        page: opts.page || 1,
        size: opts.size || 10,
      })
      myComments.value = result?.data?.list || []
      myTotal.value = result?.data?.total || 0
      return result
    } finally {
      loading.value = false
    }
  }

  async function fetchAdminComments(opts = {}) {
    loading.value = true
    try {
      const q = { ...adminQuery.value, ...opts }
      const result = await commentService.fetchAdminComments({
        page: q.page,
        size: q.size,
        keyword: q.keyword || undefined,
        status: q.status != null && q.status !== '' ? Number(q.status) : undefined,
        blogId: q.blogId || undefined,
      })
      adminComments.value = result?.data?.list || []
      adminTotal.value = result?.data?.total || 0
      return result
    } finally {
      loading.value = false
    }
  }

  async function reviewComment(commentId, status) {
    const result = await commentService.reviewComment(commentId, status)
    const comment = adminComments.value.find((c) => c.commentId === commentId)
    if (comment) comment.status = status
    return result
  }

  async function batchReview(commentIds, status) {
    const result = await commentService.batchReviewComments(commentIds, status)
    adminComments.value = adminComments.value.map((c) =>
      commentIds.includes(c.commentId) ? { ...c, status } : c
    )
    return result
  }

  async function removeComment(commentId) {
    loading.value = true
    try {
      const result = await commentService.adminDeleteComment(commentId)
      adminComments.value = adminComments.value.filter((c) => c.commentId !== commentId)
      return result
    } finally {
      loading.value = false
    }
  }

  async function fetchStats(days = 30) {
    loading.value = true
    try {
      const result = await commentService.fetchCommentStats(days)
      stats.value = result?.data || null
      return result
    } finally {
      loading.value = false
    }
  }

  async function fetchReports(opts = {}) {
    loading.value = true
    try {
      const q = { ...reportQuery.value, ...opts }
      const result = await commentService.fetchReports({
        page: q.page,
        size: q.size,
        status: q.status !== '' ? Number(q.status) : undefined,
      })
      reports.value = result?.data?.list || []
      reportTotal.value = result?.data?.total || 0
      return result
    } finally {
      loading.value = false
    }
  }

  async function handleReport(reportId, status) {
    const result = await commentService.handleReport(reportId, status)
    const report = reports.value.find((r) => r.id === reportId)
    if (report) report.status = status
    return result
  }

  function resetQuery() {
    query.value = { page: 1, size: 10 }
    comments.value = []
    total.value = 0
  }

  function resetAdminQuery() {
    adminQuery.value = { page: 1, size: 10, keyword: '', status: '', blogId: '' }
    adminComments.value = []
    adminTotal.value = 0
  }

  return {
    comments,
    myComments,
    adminComments,
    stats,
    loading,
    total,
    myTotal,
    adminTotal,
    query,
    adminQuery,
    commentCount,
    fetchCommentsForBlog,
    createNewComment,
    likeComment,
    deleteComment,
    fetchMyComments,
    fetchAdminComments,
    reviewComment,
    batchReview,
    removeComment,
    fetchStats,
    fetchReports,
    handleReport,
    reports,
    reportTotal,
    reportQuery,
    resetQuery,
    resetAdminQuery,
  }
})
