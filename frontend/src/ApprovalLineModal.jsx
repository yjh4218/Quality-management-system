import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchActiveDepartments, fetchCompanyUsersForApproval } from './api';

/**
 * 조직도 기반 전자결재 결재라인 지정 모달 (이미지 2, 4 UI/UX 준용)
 * - 조직도(회사 > 부서 > 사원) 트리 브라우징 (사내 본사 임직원 전용)
 * - 사용자 다중 선택 및 [결재], [합의], [수신참조] 액션 배정
 * - 순서 조정 (▲, ▼) 및 결재 단계 자동 번호 부여
 */
const ApprovalLineModal = ({
    isOpen,
    onClose,
    currentUser,
    initialApprovers = [],
    initialConsensus = [],
    initialReferences = [],
    onSave
}) => {
    const userCompany = currentUser?.companyName || '';

    // 모달 탭: 'ORG' (조직도), 'PERSONAL' (개인결재라인)
    const [activeTab, setActiveTab] = useState('ORG');
    const [approvalListTab, setApprovalListTab] = useState('MAIN'); // 'MAIN' (결재/합의), 'REF' (수신참조)

    // 트리 및 데이터 상태
    const [companies, setCompanies] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(userCompany);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [expandedCompanies, setExpandedCompanies] = useState(new Set([userCompany]));

    // 검색 및 사용자 목록
    const [searchType, setSearchType] = useState('name');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [debouncedKeyword, setDebouncedKeyword] = useState('');
    const [candidateUsers, setCandidateUsers] = useState([]);
    const [selectedCandidateIds, setSelectedCandidateIds] = useState(new Set());

    // 300ms 검색 디바운스 적용 (불필요한 API 호출 방지)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedKeyword(searchKeyword);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchKeyword]);

    // 구성된 결재라인 상태
    // item: { id: userId, name, department, position, companyName, stepType: 'APPROVAL' | 'CONSENSUS' | 'REFERENCE' }
    const [approverList, setApproverList] = useState([]);
    const [consensusList, setConsensusList] = useState([]);
    const [referenceList, setReferenceList] = useState([]);

    // 초기값 동기화
    useEffect(() => {
        if (!isOpen) return;
        setApproverList(initialApprovers || []);
        setConsensusList(initialConsensus || []);
        setReferenceList(initialReferences || []);
        setSelectedCandidateIds(new Set());
    }, [isOpen, initialApprovers, initialConsensus, initialReferences]);

    // 회사 및 부서 마스터 동적 로드 (사내 전자결재 조직도: 외부 제조사는 결재 대상이 아니므로 본사 조직/부서만 로드)
    useEffect(() => {
        if (!isOpen) return;
        const loadOrgData = async () => {
            try {
                const deptRes = await fetchActiveDepartments(userCompany).catch(() => ({ data: [] }));
                const deptList = deptRes.data || [];

                // 기안자의 소속 회사(본사)를 우선하고, 없을 경우 부서 마스터의 회사명을 동적으로 결정
                let targetCompany = userCompany;
                if (!targetCompany && deptList.length > 0) {
                    targetCompany = deptList[0].companyName;
                }

                const compList = targetCompany ? [targetCompany] : [];
                setCompanies(compList);
                setDepartments(deptList);
                setSelectedCompany(targetCompany);
                setSelectedDeptId(null);
                if (targetCompany) {
                    setExpandedCompanies(new Set([targetCompany]));
                }
            } catch (err) {
                console.error("Failed to load org data", err);
            }
        };
        loadOrgData();
    }, [isOpen, userCompany]);

    // 부서별 또는 검색 사용자 로드
    const loadUsers = useCallback(async () => {
        try {
            const targetCompany = selectedCompany || userCompany;
            const res = await fetchCompanyUsersForApproval(debouncedKeyword.trim(), targetCompany);
            let users = res.data || [];

            // 부서 필터링 (검색어가 없을 때)
            if (!debouncedKeyword.trim() && selectedDeptId) {
                const dept = departments.find(d => d.id === selectedDeptId);
                if (dept) {
                    users = users.filter(u => u.department === dept.name || u.department === dept.code);
                }
            }

            setCandidateUsers(users);
        } catch (err) {
            console.error("Failed to load users for org tree", err);
        }
    }, [debouncedKeyword, selectedCompany, selectedDeptId, departments, userCompany]);

    useEffect(() => {
        if (isOpen) {
            loadUsers();
        }
    }, [isOpen, loadUsers]);

    // 회사 트리 확장 토글
    const toggleCompanyExpand = (compName) => {
        setExpandedCompanies(prev => {
            const next = new Set(prev);
            if (next.has(compName)) next.delete(compName);
            else next.add(compName);
            return next;
        });
        setSelectedCompany(compName);
    };

    // 후보 사용자 체크박스 토글
    const handleToggleCandidate = (userId) => {
        setSelectedCandidateIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    const handleSelectAllCandidates = (e) => {
        if (e.target.checked) {
            setSelectedCandidateIds(new Set(candidateUsers.map(u => u.id)));
        } else {
            setSelectedCandidateIds(new Set());
        }
    };

    // 배정 액션: [결재], [합의], [수신참조]
    const assignSelectedUsers = (type) => {
        const usersToAdd = candidateUsers.filter(u => selectedCandidateIds.has(u.id));
        if (usersToAdd.length === 0) return;

        if (type === 'APPROVAL') {
            setApproverList(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const filtered = usersToAdd.filter(u => !existingIds.has(u.id)).map(u => ({ ...u, stepType: 'APPROVAL' }));
                return [...prev, ...filtered];
            });
            setApprovalListTab('MAIN');
        } else if (type === 'CONSENSUS') {
            setConsensusList(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const filtered = usersToAdd.filter(u => !existingIds.has(u.id)).map(u => ({ ...u, stepType: 'CONSENSUS' }));
                return [...prev, ...filtered];
            });
            setApprovalListTab('MAIN');
        } else if (type === 'REFERENCE') {
            setReferenceList(prev => {
                const existingIds = new Set(prev.map(p => p.id));
                const filtered = usersToAdd.filter(u => !existingIds.has(u.id)).map(u => ({ ...u, stepType: 'REFERENCE' }));
                return [...prev, ...filtered];
            });
            setApprovalListTab('REF');
        }

        setSelectedCandidateIds(new Set());
    };

    // 결재선 항목 삭제
    const removeLineItem = (id, type) => {
        if (type === 'APPROVAL') {
            setApproverList(prev => prev.filter(item => item.id !== id));
        } else if (type === 'CONSENSUS') {
            setConsensusList(prev => prev.filter(item => item.id !== id));
        } else if (type === 'REFERENCE') {
            setReferenceList(prev => prev.filter(item => item.id !== id));
        }
    };

    // 순서 조정 (결재선 이동 ▲, ▼)
    const moveLineItem = (index, direction, type) => {
        if (type === 'APPROVAL') {
            const list = [...approverList];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= list.length) return;
            const temp = list[index];
            list[index] = list[targetIndex];
            list[targetIndex] = temp;
            setApproverList(list);
        } else if (type === 'CONSENSUS') {
            const list = [...consensusList];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= list.length) return;
            const temp = list[index];
            list[index] = list[targetIndex];
            list[targetIndex] = temp;
            setConsensusList(list);
        }
    };

    // 저장 핸들러
    const handleSave = () => {
        onSave?.({
            approvers: approverList,
            consensus: consensusList,
            references: referenceList
        });
        onClose?.();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)',
            zIndex: 10500, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                backgroundColor: '#ffffff', borderRadius: '12px',
                width: '1050px', maxWidth: '96vw', height: '780px', maxHeight: '92vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
            }}>
                {/* 헤더 */}
                <div style={{
                    padding: '16px 24px', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>📑</span>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                            결재라인 지정
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>

                {/* 상단 탭 (조직도 / 개인결재라인) & 액션 바 */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff'
                }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={() => setActiveTab('ORG')}
                            style={{
                                padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700',
                                border: 'none', cursor: 'pointer',
                                backgroundColor: activeTab === 'ORG' ? '#2563eb' : '#f1f5f9',
                                color: activeTab === 'ORG' ? '#fff' : '#475569'
                            }}
                        >
                            🌳 조직도
                        </button>
                        <button
                            onClick={() => setActiveTab('PERSONAL')}
                            style={{
                                padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: '700',
                                border: 'none', cursor: 'pointer',
                                backgroundColor: activeTab === 'PERSONAL' ? '#2563eb' : '#f1f5f9',
                                color: activeTab === 'PERSONAL' ? '#fff' : '#475569'
                            }}
                        >
                            ⭐ 개인결재라인
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            onClick={() => assignSelectedUsers('APPROVAL')}
                            style={{
                                padding: '6px 12px', backgroundColor: '#eff6ff', color: '#1d4ed8',
                                border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            ➕ 결재 배정
                        </button>
                        <button
                            onClick={() => assignSelectedUsers('CONSENSUS')}
                            style={{
                                padding: '6px 12px', backgroundColor: '#f0fdf4', color: '#15803d',
                                border: '1px solid #bbf7d0', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            ➕ 합의 배정
                        </button>
                        <button
                            onClick={() => assignSelectedUsers('REFERENCE')}
                            style={{
                                padding: '6px 12px', backgroundColor: '#f5f3ff', color: '#6d28d9',
                                border: '1px solid #ddd6fe', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            ➕ 수신참조 배정
                        </button>
                    </div>
                </div>

                {/* 메인 분할 뷰: 좌측(조직도 트리), 우측 상단(소속 사원), 우측 하단(지정된 결재선) */}
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, minHeight: 0 }}>
                    {/* 좌측 패널: 검색 및 조직도 트리 */}
                    <div style={{
                        borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
                        backgroundColor: '#fafafa', padding: '12px'
                    }}>
                        {/* 검색창 */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                            <select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                                style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                            >
                                <option value="name">사용자</option>
                                <option value="dept">부서</option>
                            </select>
                            <input
                                type="text"
                                placeholder="검색어를 입력하세요..."
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                                style={{ flex: 1, padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px' }}
                            />
                        </div>

                        {/* 조직도 폴더 트리 */}
                        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px' }}>
                            {companies.map(comp => {
                                const isExpanded = expandedCompanies.has(comp);
                                const isCurrentComp = comp === selectedCompany;
                                const compDepts = departments.filter(d => d.companyName === comp);

                                return (
                                    <div key={comp} style={{ marginBottom: '6px' }}>
                                        <div
                                            onClick={() => {
                                                toggleCompanyExpand(comp);
                                                setSelectedDeptId(null);
                                            }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px',
                                                borderRadius: '4px', cursor: 'pointer',
                                                backgroundColor: isCurrentComp ? '#e0f2fe' : 'transparent',
                                                fontWeight: isCurrentComp ? 'bold' : 'normal',
                                                fontSize: '13px', color: '#1e293b'
                                            }}
                                        >
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>{isExpanded ? '▼' : '▶'}</span>
                                            <span>🏢</span>
                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {comp} {comp === userCompany ? '(본사)' : ''}
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>({compDepts.length})</span>
                                        </div>

                                        {isExpanded && (
                                            <div style={{ paddingLeft: '20px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                {compDepts.length === 0 ? (
                                                    <span style={{ fontSize: '11px', color: '#94a3b8', padding: '4px 6px' }}>등록된 부서 없음</span>
                                                ) : (
                                                    compDepts.map(dept => {
                                                        const isDeptSelected = selectedDeptId === dept.id;
                                                        return (
                                                            <div
                                                                key={dept.id}
                                                                onClick={() => {
                                                                    setSelectedDeptId(dept.id);
                                                                    setSelectedCompany(comp);
                                                                }}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px',
                                                                    borderRadius: '4px', cursor: 'pointer',
                                                                    backgroundColor: isDeptSelected ? '#dbeafe' : 'transparent',
                                                                    color: isDeptSelected ? '#1e40af' : '#475569',
                                                                    fontWeight: isDeptSelected ? 'bold' : 'normal',
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                <span>📁</span>
                                                                <span>{dept.name}</span>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 우측 패널: 상단(선택 부서원 목록), 하단(지정된 결재선) */}
                    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        {/* 상단: 부서 사원 선택 그리드 */}
                        <div style={{ flex: 1, padding: '14px', borderBottom: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', minHeight: '200px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155' }}>
                                    👤 임직원 목록 ({candidateUsers.length}명)
                                </span>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    체크박스 선택 후 상단 <b>[결재/합의/수신참조]</b> 버튼을 누르면 배정됩니다.
                                </span>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead style={{ backgroundColor: '#f1f5f9', position: 'sticky', top: 0, zIndex: 1 }}>
                                        <tr>
                                            <th style={{ width: '38px', padding: '8px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    onChange={handleSelectAllCandidates}
                                                    checked={candidateUsers.length > 0 && selectedCandidateIds.size === candidateUsers.length}
                                                />
                                            </th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>회사</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>부서</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>직책</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>성명</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#475569' }}>이메일</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {candidateUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                                                    선택한 부서에 소속된 사원이 없거나 검색 결과가 없습니다.
                                                </td>
                                            </tr>
                                        ) : (
                                            candidateUsers.map(user => {
                                                const isChecked = selectedCandidateIds.has(user.id);
                                                return (
                                                    <tr
                                                        key={user.id}
                                                        onClick={() => handleToggleCandidate(user.id)}
                                                        style={{
                                                            borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                                            backgroundColor: isChecked ? '#eff6ff' : '#fff'
                                                        }}
                                                    >
                                                        <td style={{ textAlign: 'center', padding: '6px' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={() => handleToggleCandidate(user.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '6px 8px' }}>{user.companyName || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{user.department || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{user.position || '담당'}</td>
                                                        <td style={{ padding: '6px 8px', fontWeight: 'bold', color: '#0f172a' }}>{user.name}</td>
                                                        <td style={{ padding: '6px 8px', color: '#64748b' }}>{user.email || '-'}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 하단: 지정된 결재라인 목록 */}
                        <div style={{ flex: 1, padding: '14px', display: 'flex', flexDirection: 'column', minHeight: '220px', backgroundColor: '#fcfcfc' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setApprovalListTab('MAIN')}
                                        style={{
                                            padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                            backgroundColor: approvalListTab === 'MAIN' ? '#0f172a' : '#e2e8f0',
                                            color: approvalListTab === 'MAIN' ? '#fff' : '#475569'
                                        }}
                                    >
                                        결재 / 합의 ({approverList.length + consensusList.length})
                                    </button>
                                    <button
                                        onClick={() => setApprovalListTab('REF')}
                                        style={{
                                            padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer',
                                            backgroundColor: approvalListTab === 'REF' ? '#0f172a' : '#e2e8f0',
                                            color: approvalListTab === 'REF' ? '#fff' : '#475569'
                                        }}
                                    >
                                        수신참조 ({referenceList.length})
                                    </button>
                                </div>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>
                                    결재 순서는 ▲ / ▼ 버튼으로 조정할 수 있습니다.
                                </span>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#fff' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead style={{ backgroundColor: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                                        <tr>
                                            <th style={{ width: '60px', padding: '6px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>순서조정</th>
                                            <th style={{ width: '40px', padding: '6px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>NO</th>
                                            <th style={{ width: '70px', padding: '6px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>종류</th>
                                            <th style={{ padding: '6px 8px', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>회사</th>
                                            <th style={{ padding: '6px 8px', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>부서</th>
                                            <th style={{ padding: '6px 8px', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>직책</th>
                                            <th style={{ padding: '6px 8px', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>성명</th>
                                            <th style={{ width: '50px', padding: '6px', borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>삭제</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {approvalListTab === 'MAIN' ? (
                                            <>
                                                {/* 기안자 (고정 1단계) */}
                                                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>-</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 'bold' }}>1</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <span style={{ padding: '2px 6px', backgroundColor: '#e2e8f0', color: '#334155', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>기안</span>
                                                    </td>
                                                    <td style={{ padding: '6px 8px' }}>{currentUser?.companyName || '-'}</td>
                                                    <td style={{ padding: '6px 8px' }}>{currentUser?.department || '-'}</td>
                                                    <td style={{ padding: '6px 8px' }}>{currentUser?.position || '담당'}</td>
                                                    <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{currentUser?.name} (본인)</td>
                                                    <td style={{ textAlign: 'center', color: '#94a3b8' }}>-</td>
                                                </tr>

                                                {/* 결재자 목록 */}
                                                {approverList.map((item, idx) => (
                                                    <tr key={`app-${item.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                        <td style={{ textAlign: 'center', padding: '4px' }}>
                                                            <button
                                                                type="button"
                                                                disabled={idx === 0}
                                                                onClick={() => moveLineItem(idx, -1, 'APPROVAL')}
                                                                style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
                                                            >
                                                                ▲
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={idx === approverList.length - 1}
                                                                onClick={() => moveLineItem(idx, 1, 'APPROVAL')}
                                                                style={{ border: 'none', background: 'none', cursor: idx === approverList.length - 1 ? 'default' : 'pointer', opacity: idx === approverList.length - 1 ? 0.3 : 1 }}
                                                            >
                                                                ▼
                                                            </button>
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 2}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{ padding: '2px 6px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>결재</span>
                                                        </td>
                                                        <td style={{ padding: '6px 8px' }}>{item.companyName || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{item.department || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{item.position || '담당'}</td>
                                                        <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{item.name}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLineItem(item.id, 'APPROVAL')}
                                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}

                                                {/* 합의자 목록 */}
                                                {consensusList.map((item, idx) => (
                                                    <tr key={`con-${item.id}`} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f0fdf4' }}>
                                                        <td style={{ textAlign: 'center', padding: '4px' }}>
                                                            <button
                                                                type="button"
                                                                disabled={idx === 0}
                                                                onClick={() => moveLineItem(idx, -1, 'CONSENSUS')}
                                                                style={{ border: 'none', background: 'none', cursor: idx === 0 ? 'default' : 'pointer', opacity: idx === 0 ? 0.3 : 1 }}
                                                            >
                                                                ▲
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={idx === consensusList.length - 1}
                                                                onClick={() => moveLineItem(idx, 1, 'CONSENSUS')}
                                                                style={{ border: 'none', background: 'none', cursor: idx === consensusList.length - 1 ? 'default' : 'pointer', opacity: idx === consensusList.length - 1 ? 0.3 : 1 }}
                                                            >
                                                                ▼
                                                            </button>
                                                        </td>
                                                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: '#16a34a' }}>합의</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <span style={{ padding: '2px 6px', backgroundColor: '#dcfce7', color: '#15803d', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>합의</span>
                                                        </td>
                                                        <td style={{ padding: '6px 8px' }}>{item.companyName || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{item.department || '-'}</td>
                                                        <td style={{ padding: '6px 8px' }}>{item.position || '담당'}</td>
                                                        <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{item.name}</td>
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeLineItem(item.id, 'CONSENSUS')}
                                                                style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}

                                                {approverList.length === 0 && consensusList.length === 0 && (
                                                    <tr>
                                                        <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                                                            배정된 결재자 또는 합의자가 없습니다. 상단에서 사원을 선택하여 배정하십시오.
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        ) : (
                                            /* 수신참조 목록 */
                                            <>
                                                {referenceList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="8" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                                                            배정된 수신참조자가 없습니다.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    referenceList.map((item, idx) => (
                                                        <tr key={`ref-${item.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                            <td style={{ textAlign: 'center', color: '#94a3b8' }}>-</td>
                                                            <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span style={{ padding: '2px 6px', backgroundColor: '#f3e8ff', color: '#7e22ce', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>참조</span>
                                                            </td>
                                                            <td style={{ padding: '6px 8px' }}>{item.companyName || '-'}</td>
                                                            <td style={{ padding: '6px 8px' }}>{item.department || '-'}</td>
                                                            <td style={{ padding: '6px 8px' }}>{item.position || '담당'}</td>
                                                            <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{item.name}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeLineItem(item.id, 'REFERENCE')}
                                                                    style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 하단 푸터 액션 바 */}
                <div style={{
                    padding: '14px 24px', backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'flex-end', gap: '10px'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: '8px 18px', backgroundColor: '#fff', border: '1px solid #cbd5e1',
                            borderRadius: '6px', fontSize: '13px', fontWeight: '600', color: '#475569', cursor: 'pointer'
                        }}
                    >
                        취소
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        style={{
                            padding: '8px 24px', backgroundColor: '#2563eb', border: 'none',
                            borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', color: '#fff', cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
                        }}
                    >
                        저장 및 적용
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApprovalLineModal;
