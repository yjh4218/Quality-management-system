package com.example.ims.service;

import com.example.ims.entity.BugReport;
import com.example.ims.repository.BugReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BugReportService {

    private final BugReportRepository bugReportRepository;

    @Transactional
    public BugReport submitReport(BugReport report) {
        return bugReportRepository.save(report);
    }

    @Transactional(readOnly = true)
    public List<BugReport> getAllReports() {
        return bugReportRepository.findAllByOrderByCreatedAtDesc();
    }

    @Transactional
    public BugReport updateStatus(Long id, String status) {
        BugReport report = bugReportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bug report not found"));
        report.setStatus(status);
        report.setUpdatedAt(LocalDateTime.now());
        return bugReportRepository.save(report);
    }
}
