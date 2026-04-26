import * as api from './api';
import { toast } from 'react-toastify';
import SaveConfirmModal from './components/SaveConfirmModal';
import { usePermissions } from './usePermissions';

const SalesChannelManagement = ({ user }) => {
    const { canEdit: checkEdit, canDelete: checkDelete } = usePermissions(user);
    const canEdit = checkEdit('salesChannels');
    const canDelete = checkDelete('salesChannels');
    const [channels, setChannels] = useState([]);
    const [showDrawer, setShowDrawer] = useState(false);
    const [editingChannel, setEditingChannel] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            const res = await api.getSalesChannels();
            setChannels(res.data);
        } catch (error) {
            toast.error("채널 목록을 불러오지 못했습니다.");
        }
    };

    const handleOpenDrawer = (channel = null) => {
        if (channel) {
            setEditingChannel(channel);
            setFormData({ name: channel.name, description: channel.description || '' });
        } else {
            setEditingChannel(null);
            setFormData({ name: '', description: '' });
        }
        setShowDrawer(true);
    };

    const handleSave = (e) => {
        if (e) e.preventDefault();
        setIsConfirmOpen(true);
    };

    const handleConfirmSave = async () => {
        setIsConfirmOpen(false);
        try {
            const channelData = editingChannel ? { ...editingChannel, ...formData } : formData;
            await api.saveSalesChannel(channelData);
            toast.success(editingChannel ? "채널이 수정되었습니다." : "새 채널이 등록되었습니다.");
            setShowDrawer(false);
            fetchChannels();
        } catch (error) {
            toast.error("저장 실패: " + (error.response?.data?.message || "오류가 발생했습니다."));
        }
    };

    const handleToggle = async (id) => {
        try {
            await api.toggleSalesChannel(id);
            fetchChannels();
        } catch (error) {
            toast.error("상태 변경 실패");
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm("정말로 이 채널을 삭제하시겠습니까? 관련 데이터가 있을 경우 오류가 발생할 수 있습니다.")) {
            try {
                await api.deleteSalesChannel(id);
                toast.success("채널이 삭제되었습니다.");
                fetchChannels();
            } catch (error) {
                toast.error("삭제 실패: 관련 데이터가 존재할 수 있습니다.");
            }
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div className="header-title">
                    <h2>🌐 유통 채널 관리</h2>
                    <p>제품 마스터 및 포장 규칙에서 사용할 유통 채널을 관리합니다.</p>
                </div>
                <button className="primary" onClick={() => handleOpenDrawer()} style={{ opacity: canEdit ? 1 : 0.5 }} disabled={!canEdit}>+ 신규 채널 등록</button>
            </div>

            <div className="card">
                <table className="qms-table">
                    <thead>
                        <tr>
                            <th>채널명</th>
                            <th>설명</th>
                            <th>상태</th>
                            <th>최종 수정</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {channels.map(channel => (
                            <tr key={channel.id}>
                                <td style={{ fontWeight: 'bold' }}>{channel.name}</td>
                                <td>{channel.description || '-'}</td>
                                <td>
                                    <span className={`badge ${channel.active ? 'success' : 'warning'}`}>
                                        {channel.active ? '활성' : '비활성'}
                                    </span>
                                </td>
                                <td style={{ fontSize: '12px', color: '#666' }}>
                                    {channel.updatedBy}<br/>
                                    {new Date(channel.updatedAt).toLocaleString()}
                                </td>
                                <td>
                                    <div className="actions">
                                        <button className="action-btn" onClick={() => handleOpenDrawer(channel)}>{canEdit ? '수정' : '조회'}</button>
                                        <button className="action-btn" onClick={() => handleToggle(channel.id)} style={{ opacity: canEdit ? 1 : 0.5 }} disabled={!canEdit}>
                                            {channel.active ? '비활성화' : '활성화'}
                                        </button>
                                        <button className="delete-btn" onClick={() => handleDelete(channel.id)} style={{ opacity: canDelete ? 1 : 0.5 }} disabled={!canDelete}>삭제</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showDrawer && (
                <div className="drawer-overlay" onClick={() => setShowDrawer(false)}>
                    <div className="drawer" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
                        <div className="page-header">
                            <h3>{editingChannel ? '📝 채널 수정' : '🆕 신규 채널 등록'}</h3>
                            <button className="secondary" onClick={() => setShowDrawer(false)}>닫기</button>
                        </div>
                        <form onSubmit={handleSave} style={{ marginTop: '20px' }}>
                            <div className="form-group">
                                <label>채널명 (Channel Name) *</label>
                                <input 
                                    type="text" 
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    placeholder="예: 올리브영(OY), 아마존(AMZ)"
                                    required
                                    disabled={!canEdit}
                                />
                            </div>
                            <div className="form-group">
                                <label>설명 (Description)</label>
                                <textarea 
                                    value={formData.description} 
                                    onChange={e => setFormData({...formData, description: e.target.value})} 
                                    placeholder="해당 유통 채널에 대한 설명을 입력하세요."
                                    rows={4}
                                    disabled={!canEdit}
                                />
                            </div>
                             <div style={{ marginTop: '30px', display: 'flex', gap: '10px' }}>
                                 <button type="submit" className="primary" style={{ flex: 1, opacity: canEdit ? 1 : 0.5 }} disabled={!canEdit}>
                                     {canEdit ? (editingChannel ? '수정' : '저장') : '조회 전용'}
                                 </button>
                                 <button type="button" className="secondary" onClick={() => setShowDrawer(false)} style={{ flex: 1 }}>취소</button>
                             </div>
                        </form>
                    </div>
                </div>
            )}
            {isConfirmOpen && (
                <SaveConfirmModal
                    isOpen={isConfirmOpen}
                    onClose={() => setIsConfirmOpen(false)}
                    onConfirm={handleConfirmSave}
                />
            )}
        </div>
    );
};

export default SalesChannelManagement;
