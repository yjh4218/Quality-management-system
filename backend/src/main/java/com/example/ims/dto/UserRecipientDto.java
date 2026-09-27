package com.example.ims.dto;

import com.example.ims.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRecipientDto {
    private Long id;
    private String username;
    private String name;
    private String email;
    private String companyName;
    private String department;
    private String position;
    private String role;

    public static UserRecipientDto fromEntity(User user) {
        if (user == null) return null;
        return UserRecipientDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .email(user.getEmail())
                .companyName(user.getCompanyName())
                .department(user.getDepartment())
                .position(user.getPosition())
                .role(user.getRole())
                .build();
    }
}
