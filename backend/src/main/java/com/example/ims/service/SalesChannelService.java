package com.example.ims.service;

import com.example.ims.entity.SalesChannel;
import com.example.ims.repository.SalesChannelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SalesChannelService {

    private final SalesChannelRepository repository;

    @Transactional(readOnly = true)
    public List<SalesChannel> getAllChannels() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public List<SalesChannel> getActiveChannels() {
        return repository.findAll().stream().filter(SalesChannel::isActive).toList();
    }

    @Transactional
    public SalesChannel saveChannel(SalesChannel channel, String username) {
        if (channel.getId() == null && repository.existsByName(channel.getName())) {
            throw new RuntimeException("이미 존재하는 채널명입니다: " + channel.getName());
        }
        channel.setUpdatedBy(username);
        return repository.save(channel);
    }

    @Transactional
    public void deleteChannel(Long id) {
        repository.deleteById(id);
    }

    @Transactional
    public void toggleActive(Long id) {
        repository.findById(id).ifPresent(ch -> {
            ch.setActive(!ch.isActive());
            repository.save(ch);
        });
    }
}
