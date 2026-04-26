package com.example.ims.config;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StorageConfig {

    @Value("${storage.s3.endpoint:}")
    private String endpoint;

    @Value("${storage.s3.region:ap-northeast-2}")
    private String region;

    @Value("${storage.s3.access-key:}")
    private String accessKey;

    @Value("${storage.s3.secret-key:}")
    private String secretKey;

    @Value("${storage.type:local}")
    private String storageType;

    @Bean
    public AmazonS3 amazonS3() {
        if (!"s3".equalsIgnoreCase(storageType)) {
            return null; // Local mode
        }

        AmazonS3ClientBuilder builder = AmazonS3ClientBuilder.standard()
                .withCredentials(new AWSStaticCredentialsProvider(new BasicAWSCredentials(accessKey, secretKey)));

        if (endpoint != null && !endpoint.isEmpty()) {
            builder.withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(endpoint, region));
        } else {
            builder.withRegion(region);
        }

        return builder.build();
    }
}
