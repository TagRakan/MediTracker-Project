package com.MTA.V01.models.enumerationClasses;

import com.MTA.V01.models.enumerations.EAilmentStatus;
import com.MTA.V01.models.enumerations.ELogType;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "log_type")
@NoArgsConstructor
@Setter
@Getter
public class LogType {
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Id
    @JsonIgnore
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(length = 35)
    private ELogType name;
}
