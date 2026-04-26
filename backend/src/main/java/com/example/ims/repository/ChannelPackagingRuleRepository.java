package com.example.ims.repository;

import com.example.ims.entity.ChannelPackagingRule;
import com.example.ims.entity.SalesChannel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelPackagingRuleRepository extends JpaRepository<ChannelPackagingRule, Long> {
    List<ChannelPackagingRule> findByChannel(SalesChannel channel);
    Optional<ChannelPackagingRule> findByChannelAndRuleType(SalesChannel channel, String ruleType);
}
