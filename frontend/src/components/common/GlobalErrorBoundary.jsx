import React from 'react';
import { Box, Typography, Button, Paper, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { reportGlobalError } from '../../utils/globalErrorListener';

/**
 * [전역 에러 바운더리]
 * React 렌더링 라이프사이클에서 발생하는 최상위 치명적 에러를 격리하고 화면 백화를 방지합니다.
 */
export class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        const stack = errorInfo?.componentStack || error?.stack || 'N/A';
        const msg = error?.message || 'React 렌더링 치명적 오류';
        reportGlobalError(msg, stack, 'GlobalErrorBoundary (Root)', 'REACT_RENDER_CRASH');
    }

    handleReload = () => {
        window.location.reload();
    };

    handleResetHome = () => {
        try {
            sessionStorage.clear();
        } catch (e) {
            // ignore
        }
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            const { error, errorInfo } = this.state;
            return (
                <Box
                    sx={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: '#f4f6f8',
                        p: 3
                    }}
                >
                    <Paper
                        elevation={4}
                        sx={{
                            maxWidth: 640,
                            width: '100%',
                            p: 4,
                            borderRadius: 3,
                            textAlign: 'center',
                            border: '1px solid #e0e6ed',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.08)'
                        }}
                    >
                        <Box sx={{ fontSize: 56, mb: 2 }}>⚠️</Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a202c', mb: 1.5 }}>
                            시스템 화면을 표시하는 중 문제가 발생했습니다
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#4a5568', mb: 3, lineHeight: 1.6 }}>
                            예기치 않은 런타임 오류로 인해 화면이 일시적으로 중단되었습니다.<br />
                            <strong>시스템 버그 리포트가 관리팀에 자동으로 접수</strong>되었으며, 아래 버튼으로 즉시 복구할 수 있습니다.
                        </Typography>

                        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', mb: 3 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={this.handleReload}
                                sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 600 }}
                            >
                                🔄 새로고침
                            </Button>
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={this.handleResetHome}
                                sx={{ px: 3, py: 1, borderRadius: 2, fontWeight: 600 }}
                            >
                                🏠 홈 화면으로 이동
                            </Button>
                        </Box>

                        <Accordion sx={{ mt: 2, textAlign: 'left', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px !important' }}>
                            <AccordionSummary sx={{ fontSize: 13, color: '#718096' }}>
                                🔍 기술 상세 정보 보기 (오류 진단용)
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 2 }}>
                                <Typography variant="caption" component="div" sx={{ fontFamily: 'monospace', color: '#e53e3e', mb: 1, fontWeight: 700, wordBreak: 'break-all' }}>
                                    {error?.toString()}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    component="pre"
                                    sx={{
                                        fontFamily: 'monospace',
                                        fontSize: 11,
                                        color: '#4a5568',
                                        maxHeight: 180,
                                        overflow: 'auto',
                                        bgcolor: '#edf2f7',
                                        p: 1.5,
                                        borderRadius: 1,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-all'
                                    }}
                                >
                                    {errorInfo?.componentStack || error?.stack || 'No component stack available'}
                                </Typography>
                            </AccordionDetails>
                        </Accordion>
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}

/**
 * [탭 단위 에러 바운더리]
 * 특정 탭의 크래시가 다른 탭이나 상단 네비게이션, 사이드바 전체로 전파되지 않도록 완충합니다.
 */
export class TabErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        const stack = errorInfo?.componentStack || error?.stack || 'N/A';
        const msg = error?.message || '탭 내부 렌더링 에러';
        const tabTitle = this.props.tabTitle || this.props.tabId || '알 수 없는 탭';
        reportGlobalError(msg, stack, `TabErrorBoundary [${tabTitle}]`, 'TAB_CRASH');
    }

    componentDidUpdate(prevProps) {
        // 탭이 변경되었거나 key가 바뀌었을 때 오류 상태 리셋
        if (prevProps.tabId !== this.props.tabId && this.state.hasError) {
            this.setState({ hasError: false, error: null, errorInfo: null });
        }
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            const { tabTitle, onCloseTab } = this.props;
            const { error } = this.state;
            return (
                <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
                    <Paper
                        elevation={2}
                        sx={{
                            maxWidth: 580,
                            width: '100%',
                            p: 3.5,
                            borderRadius: 2.5,
                            border: '1px solid #fee2e2',
                            bgcolor: '#fffaf0'
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                            <span style={{ fontSize: 28 }}>🛡️</span>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#9a3412' }}>
                                [{tabTitle || '현재 탭'}] 화면을 불러올 수 없습니다
                            </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#7c2d12', mb: 2, lineHeight: 1.6 }}>
                            해당 메뉴에서 예기치 않은 오류가 발생했습니다. 다른 탭은 정상적으로 이용하실 수 있으며,
                            본 오류는 시스템 관리자에게 자동 전송되었습니다.
                        </Typography>

                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#ffffff', mb: 2.5, borderColor: '#fdba74' }}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#c2410c', fontWeight: 600, wordBreak: 'break-all' }}>
                                {error?.message || String(error)}
                            </Typography>
                        </Paper>

                        <Box sx={{ display: 'flex', gap: 1.5 }}>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={this.handleRetry}
                                sx={{ bgcolor: '#ea580c', '&:hover': { bgcolor: '#c2410c' } }}
                            >
                                🔄 탭 다시 시도
                            </Button>
                            {onCloseTab && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="inherit"
                                    onClick={onCloseTab}
                                >
                                    ✕ 탭 닫기
                                </Button>
                            )}
                        </Box>
                    </Paper>
                </Box>
            );
        }

        return this.props.children;
    }
}
